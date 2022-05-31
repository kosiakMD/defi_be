import { EntityRepository, ILike, Repository } from 'typeorm';
import { FindConditions } from 'typeorm/find-options/findConditions';

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

  async findAssetsByParams({ address, text, limit }: SearchParams): Promise<AssetEntity[]> {
    const commonConditions: FindConditions<AssetEntity> = { isTracked: true, disabled: false };
    const conditions: FindConditions<AssetEntity>[] = [];
    if (address) {
      conditions.push({ ...commonConditions, address: ILike(address) });
    }
    if (text) {
      conditions.push({ ...commonConditions, name: ILike(`%${text}%`) });
      conditions.push({ ...commonConditions, symbol: ILike(`%${text}%`) });
    }

    return this.find({
      where: conditions,
      order: {
        rank: 'ASC',
        name: 'ASC',
        symbol: 'ASC',
      },
      take: limit || 30,
    });
  }
}
