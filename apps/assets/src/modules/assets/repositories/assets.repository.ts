import { Brackets, EntityRepository, ILike, Repository } from 'typeorm';

import { ChainIdEnum } from '@app/common/enum';

import { SearchParams } from '../../../common/interfaces/search.interfaces';
import { AssetReference } from '../../../common/types';

import { AssetEntity } from '../entities/asset.entity';

@EntityRepository(AssetEntity)
export class AssetsRepository extends Repository<AssetEntity> {
  getAllTrackedAssets(): Promise<AssetEntity[]> {
    return this.find({
      where: { disabled: false, isTracked: true },
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
            qb.orWhere('name ilike :text', { text: `%${text}%` })
              .orWhere('symbol ilike :text', { text: `%${text}%` })
              .orWhere('display_name ilike :text', { text: `%${text}%` });
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
}
