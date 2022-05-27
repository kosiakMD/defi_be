import { EntityRepository, ILike, Repository } from 'typeorm';
import { FindConditions } from 'typeorm/find-options/FindConditions';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common/enum';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

// import { TimeGranularity } from '../../prices/enums/time-granularity.enum';
import { GetAssetRequest } from '../dto/get-asset.request';
import { AssetEntity } from '../entities/asset.entity';

export type AssetReference = {
  chainId: number;
  address: string;
};

@Injectable()
@EntityRepository(AssetEntity)
export class AssetsRepository extends Repository<AssetEntity> {
  getAllTrackedAssets(): Promise<AssetEntity[]> {
    return this.find({
      where: { disabled: false, isTracked: true },
    });
  }

  findOneByAddressAndChain(
    address: string,
    chainId: ChainIdEnum,
    include?: string[],
  ): Promise<AssetEntity> {
    return this.findOne({
      where: { chainId, address: ILike(address) },
      relations: include,
    });
  }

  findManyByAddressesAndChainIds(
    requests: GetAssetRequest[],
    include?: string[],
  ): Promise<AssetEntity[]> {
    // const timeDistance = TimeGranularity.M15 * 60 * 1000;
    return this.find({
      relations: include,
      where: requests.map(({ chainId, address /*pricesAt*/ }) => ({
        chainId,
        address: ILike(address),
        // historicalPrices: pricesAt.map((priceAt) => ({
        //   timestamp: Between(
        //     new Date(priceAt - timeDistance),
        //     new Date(priceAt + timeDistance),
        //   ),
        // })),
      })),
    });
  }

  async getAllTrackedAssetChains(): Promise<number[]> {
    const chains = await this.createQueryBuilder('assets')
      .select('assets.chain_id as "chainId"')
      .where('assets.is_tracked = true and assets.disabled = false')
      .distinct(true)
      .getRawMany();
    return chains.map(({ chainId }) => chainId);
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
