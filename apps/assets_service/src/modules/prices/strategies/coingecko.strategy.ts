import { PriceSourceConfig } from 'apps/assets_service/src/common/types/PriceSourceConfig.type';
import axios, { AxiosRequestConfig } from 'axios';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';
import { PriceStrategy } from './strategy';

type CoingeckoTokens = {
  [key: string]: {
    usd: number;
  };
};

export class CoingeckoStrategy extends PriceStrategy {
  constructor() {
    super();
  }
  public async createPriceRequests(
    config: PriceSourceConfig,
    assetsRepository?: AssetsRepository,
  ): Promise<AxiosRequestConfig[]> {
    /**
     * 1) get all assets chains
     * 2) for each chain:
     *  - get all assets for chain(pagination)
     *  - create requests for assets chunks(debank chain should be detected by config.chainId)
     *  - add price jobs
     */
    const assetsChainIds = await assetsRepository.getAllTrackedAssetChains();
    const priceRequests = [];
    const { baseURL, take } = config;
    for await (const chainId of assetsChainIds) {
      const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[chainId]];
      const trackedAssetsFindConditions = {
        chainId,
        disabled: false,
      };
      const trackedAssetsNumber = await assetsRepository.count({
        where: trackedAssetsFindConditions,
      });
      let skip = 0;
      while (skip < trackedAssetsNumber) {
        priceRequests.push({
          url: `${baseURL}/${coingeckoChainId}`,
          method: 'GET',
          params: {
            // eslint-disable-next-line camelcase
            contract_addresses: (
              await assetsRepository.find({
                where: trackedAssetsFindConditions,
                take: Math.min(take, trackedAssetsNumber - skip),
                skip,
              })
            )
              .map(({ address }) => address)
              .join(','),
            // eslint-disable-next-line camelcase
            vs_currencies: 'usd',
          },
        });
        skip += take;
      }
    }
    return priceRequests;
  }
  public async fetchPrices(
    priceJobData: PriceJobData,
    assetsRepository: AssetsRepository,
  ): Promise<AssetPrice[]> {
    const assetPrices: AssetPrice[] = [];
    const {
      config,
      config: { chainId },
      sourceId,
    } = priceJobData;
    const requests = await this.createPriceRequests(config, assetsRepository);
    const responses = await Promise.all(requests.map((request) => axios.request(request)));
    for (const response of responses) {
      try {
        const data: CoingeckoTokens = response.data;
        assetPrices.push(
          ...Object.keys(data).map((key: string) => ({
            address: key,
            chainId,
            sourceId,
            priceInUsd: data[key] && data[key].usd,
          })),
        );
      } catch (error) {
        this.handleFailResponse(error);
      }
    }
    return assetPrices.flat();
  }
}
