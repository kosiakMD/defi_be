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

  async findManyByAddressesAndChainIds(
    requests: GetAssetRequest[],
    include?: string[],
  ): Promise<AssetEntity[]> {
    // TODO historical prices should be done in other smart way
    // const timeDistance = TimeGranularity.M15 * 60 * 1000;
    const assets = await this.find({
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
    const requestsMap: { [key: string]: GetAssetRequest } = {};
    requests.forEach((request) => (requestsMap[this.getAssetKey(request)] = request));
    return assets.map((asset) => {
      const key = this.getAssetKey(asset);
      const now = Date.now();
      // This filtering should be discussed. not sure it's correct to keep pricesAt as array
      asset.historicalPrices = requestsMap[key]?.pricesAt?.length
        ? asset.historicalPrices.filter((assetHistoricalPrice) => {
            const pricesAt = requestsMap[key]?.pricesAt || [];
            for (const priceAt of pricesAt) {
              if (
                (now - priceAt < 15 * 60 * 1000 &&
                  Math.abs(priceAt - assetHistoricalPrice.timestamp.getTime()) <= 15 * 60 * 1000) ||
                (now - priceAt < 60 * 60 * 1000 &&
                  Math.abs(priceAt - assetHistoricalPrice.timestamp.getTime()) <= 60 * 60 * 1000) ||
                (now - priceAt < 4 * 60 * 60 * 1000 &&
                  Math.abs(priceAt - assetHistoricalPrice.timestamp.getTime()) <=
                    4 * 60 * 60 * 1000)
              ) {
                return true;
              }
            }
            return false;
          })
        : [];
      return asset;
    });
  }

  getAssetKey({ address, chainId }) {
    return `${address}-${chainId}`;
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
