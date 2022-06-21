import { Brackets, EntityRepository, ILike, Repository } from 'typeorm';

import { Address, ChainId } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { SearchParams } from '../../../common/interfaces/search.interfaces';
import { AssetReference } from '../../../common/types';
import { AssetPair } from '../../../common/types/asset-pair';

import { AssetEntity } from '../entities/asset.entity';

@EntityRepository(AssetEntity)
export class AssetsRepository extends Repository<AssetEntity> {
  findAllTrackedAssets(): Promise<AssetEntity[]> {
    return this.find({
      where: { disabled: false, isTracked: true },
    });
  }

  findTrackedAssetsByChain(chainId: ChainId) {
    return this.find({
      where: { disabled: false, isTracked: true, chainId },
    });
  }

  findTrackedAssetsWithoutIcon(): Promise<AssetEntity[]> {
    return this.find({
      where: { disabled: false, isTracked: true, icon: null },
      relations: UNDERLYING_RELATIONS,
    });
  }

  findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetEntity> {
    return this.findOne({
      where: { chainId, address: ILike(address) },
      relations: UNDERLYING_RELATIONS,
    });
  }

  async findManyByAddressesAndChainIds(requests: AssetReference[]): Promise<AssetEntity[]> {
    if (!requests.length) {
      return [];
    }

    return this.find({
      where: requests.map(({ chainId, address }) => ({
        chainId,
        address: ILike(address),
      })),
      relations: UNDERLYING_RELATIONS,
    });
  }

  async findAssetsByParams({ addresses = [], text, limit }: SearchParams): Promise<AssetEntity[]> {
    const queryBuilder = this.createQueryBuilder('assets')
      .select()
      .where('is_tracked')
      .andWhere('disabled is false');

    if (text || addresses.length > 0) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          if (text) {
            qb.orWhere('name ilike :text', { text: `%${text}%` }).orWhere(
              'display_name ilike :text',
              { text: `%${text}%` },
            );
          }

          addresses.forEach((address, i) =>
            qb.orWhere(`address ilike :address_${i}`, { [`address_${i}`]: `%${address}%` }),
          );
        }),
      );
    }

    return queryBuilder
      .limit(limit || 5)
      .orderBy('rank', 'ASC', 'NULLS LAST')
      .addOrderBy('display_name', 'ASC')
      .addOrderBy('symbol', 'ASC')
      .addOrderBy('name', 'ASC')
      .getMany();
  }

  async findCoingeckoAssets() {
    return this.createQueryBuilder('assets')
      .select()
      .where('disabled is false')
      .andWhere(`metadata->>'coingeckoId' IS NOT NULL`)
      .getMany();
  }

  async findUniV2LikePairsForTrackedAssets(
    chainId: ChainId,
    factory: Address,
  ): Promise<AssetPair[]> {
    return this.query(
      `
      SELECT a.address AS address, a0.address AS token0, a1.address AS token1 FROM assets a
         JOIN assets_to_categories atc ON a.id = atc.asset_id
         JOIN assets_category ac ON ac.id = atc.category_id
         JOIN assets_underlying au0 ON a.id = au0.asset_id AND au0.position = 0
         JOIN assets a0 ON au0.underlying_asset_id = a0.id
         JOIN assets_underlying au1 ON a.id = au1.asset_id AND au1.position = 1
         JOIN assets a1 ON au1.underlying_asset_id = a1.id
      WHERE a.metadata->>'factory' = $1 AND a.chain_id = $2 AND ac.code = 'lp-uniswapv2-like'
      AND a0.is_tracked
      UNION ALL
      SELECT a.address AS address, a0.address AS token0, a1.address AS token1 FROM assets a
         JOIN assets_to_categories atc ON a.id = atc.asset_id
         JOIN assets_category ac ON ac.id = atc.category_id
         JOIN assets_underlying au0 ON a.id = au0.asset_id AND au0.position = 0
         JOIN assets a0 ON au0.underlying_asset_id = a0.id
         JOIN assets_underlying au1 ON a.id = au1.asset_id AND au1.position = 1
         JOIN assets a1 ON au1.underlying_asset_id = a1.id
      WHERE a.metadata->>'factory' = $1 AND a.chain_id = $2 AND ac.code = 'lp-uniswapv2-like'
      AND a1.is_tracked
    `,
      [factory, chainId],
    );
  }

  async findByCategoryCodeWithoutCategories(categoryCode: string): Promise<AssetEntity[]> {
    return this.createQueryBuilder('assets')
      .leftJoin('assets.categories', 'category')
      .where('category.code = :categoryCode', { categoryCode })
      .getMany();
  }
}

const UNDERLYING_RELATIONS = [
  // TODO: should be handled with recursive
  'underlying',
  'underlying.underlyingAsset',
  'underlying.underlyingAsset.underlying',
  'underlying.underlyingAsset.underlying.underlyingAsset',
];
