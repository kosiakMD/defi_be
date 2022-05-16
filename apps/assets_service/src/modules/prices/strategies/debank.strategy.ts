import { Chain } from 'apps/assets_service/src/common/types/chain.type';
import { PriceSourceConfig } from 'apps/assets_service/src/common/types/price-source-config.type';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { delay } from '@app/common/helpers/delay';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/asset-price.type';
import { PriceJobData } from '../types/price-job-data.type';
import { PriceRequestData } from '../types/price-request-data.type';
import { PriceStrategy } from './strategy';

type DebankToken = {
  id: string;
  price: number;
};

export class DebankStrategy extends PriceStrategy {
  private httpService: HttpService;
  private configService: ConfigService;
  constructor() {
    super();
    this.httpService = new HttpService();
    this.configService = new ConfigService();
  }

  public async createPriceRequests(
    config: PriceSourceConfig,
    assetsRepository: AssetsRepository,
  ): Promise<PriceRequestData[]> {
    /**
     * 1) get all assets chains
     * 2) for each chain:
     *  - get all assets for chain(pagination)
     *  - create requests for assets chunks(debank chain should be detected by config.chainId)
     *  - add price jobs
     */
    const assetsChainIds = await assetsRepository.getAllTrackedAssetChains();
    const priceRequests = [];
    const { baseURL, take } = config; // maximum 100 https://docs.open.debank.com/en/reference/api-pro-reference/token#get-the-list-of-the-token-information
    const { data: chains } = await firstValueFrom(
      this.httpService.get<Chain[]>(this.configService.get('ACCOUNT_SERVICE_CHAINS_LIST_URL')),
    );
    for await (const chainId of assetsChainIds) {
      const debankChain = chains.find((chain) => chain.id === chainId)?.metadata?.debankPlatformId;
      if (!debankChain) {
        this.logger.error(
          `No Coingecko chain in database on chainId: ${chainId}, see https://pro-openapi.debank.com/v1/chain/list community_ids`,
        );
        continue;
      }
      const assetsFindConditions = {
        chainId,
        disabled: false,
      };
      const trackedAssetsNumber = await assetsRepository.count({
        where: assetsFindConditions,
      });
      let skip = 0;
      while (skip < trackedAssetsNumber) {
        const request = {
          url: `${baseURL}`,
          method: 'GET', // TO_CHECK if we can move it to source config
          headers: {
            AccessKey: process.env.DEBANK_API_ACCESS_KEY,
          },
          params: {
            // eslint-disable-next-line camelcase
            chain_id: debankChain,
            ids: (
              await assetsRepository.find({
                // TO_CHECK why select doesn't work
                // select: ['address']
                where: assetsFindConditions,
                take: Math.min(take, trackedAssetsNumber - skip),
                skip,
              })
            )
              .map(({ address }) => address)
              .join(','),
          },
        };
        priceRequests.push({ request, chainId });
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
      config: { requestDelay },
      sourceId,
    } = priceJobData;
    const requests = await this.createPriceRequests(config, assetsRepository);
    this.logger.log(`Processing ${requests.length} Debank requests`);
    for await (const { request, chainId } of requests) {
      try {
        const response = await axios.request(request);
        this.logger.log(
          `Debank request ${request.url} done, got prices num: ${
            Object.keys(response.data).length
          }`,
        );
        const { data } = response;
        assetPrices.push(
          data.map((token: DebankToken) => ({
            address: token.id,
            chainId,
            sourceId,
            price: token.price,
          })),
        );
      } catch (error) {
        this.logger.error(`Error to get Debank prices on ${request.url}`);
        this.logger.error(error);
      }
      if (requestDelay) {
        await delay(requestDelay * 1000);
      }
    }
    return assetPrices.flat();
  }
}
