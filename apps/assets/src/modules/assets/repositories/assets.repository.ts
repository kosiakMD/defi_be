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
      relations: ['underlying', 'underlying.underlyingAsset'],
    });
  }

  findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetEntity> {
    return this.findOne({
      where: { chainId, address: ILike(address) },
      relations: ['underlying', 'underlying.underlyingAsset'],
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
      relations: ['underlying', 'underlying.underlyingAsset'],
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

          // TODO: Or seems to be not working here
          addresses.forEach((address) =>
            qb.orWhere('address ilike :address', { address: `%${address}%` }),
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

  async findUniV2LikePairsForTrackedAssets(
    chainId: ChainId,
    factory: Address,
    baseAssets: Address[],
  ): Promise<AssetPair[]> {
    if (!baseAssets.length) {
      return [];
    }

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
      AND a0.is_tracked AND a1.address = ANY($3)
      UNION ALL
      SELECT a.address AS address, a0.address AS token0, a1.address AS token1 FROM assets a
         JOIN assets_to_categories atc ON a.id = atc.asset_id
         JOIN assets_category ac ON ac.id = atc.category_id
         JOIN assets_underlying au0 ON a.id = au0.asset_id AND au0.position = 0
         JOIN assets a0 ON au0.underlying_asset_id = a0.id
         JOIN assets_underlying au1 ON a.id = au1.asset_id AND au1.position = 1
         JOIN assets a1 ON au1.underlying_asset_id = a1.id
      WHERE a.metadata->>'factory' = $1 AND a.chain_id = $2 AND ac.code = 'lp-uniswapv2-like'
      AND a0.address = ANY($3) AND a1.is_tracked
    `,
      [factory, chainId, baseAssets],
    );
  }
}
