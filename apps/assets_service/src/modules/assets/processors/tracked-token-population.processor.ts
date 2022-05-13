import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Chain } from '../../../common/types/chain.type';

import { CoingeckoToken } from '../types/coingecko-token.type';
import { CoinmarketcapToken } from '../types/coinmarketcap-toekn.type';
import { AssetsProcessor } from './assets.processor';

@Injectable()
export class TrackedTokenPopulationProcessor {
  private coingeckoPlatformChainIdEnum: { [key: string]: number };
  private coinmarketcapPlatformChainIdEnum: { [key: string]: number };
  constructor(
    private assetsProcessor: AssetsProcessor,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private httpService: HttpService,
  ) {
    this.coingeckoPlatformChainIdEnum = {};
    this.coinmarketcapPlatformChainIdEnum = {};
  }

  @Cron('0 10 * * *')
  async processor() {
    this.logger.log('Every day at 10AM tracked tokens population processing...');
    // Tracked Tokens Population - TTP
    this.processingTTP();
  }

  private async processingTTP(): Promise<void> {
    /**
     * get tokens(for each Coinmarketcap and Coingecko)
     * for each token
     *  - define chain id
     *  - run assets processor to release a new token
     */

    // get all chains to fill chain id enums
    await this.getAllChains();

    // COINGECKO TOKENS
    this.runCoingecoTokenListRequest();

    // COINMARKETCAP TOKENS
    this.runCoinmarketcapTokensRequest();
  }

  private async getAllChains(): Promise<void> {
    const { data } = await firstValueFrom(
      this.httpService.get<Chain[]>(this.configService.get('ACCOUNT_SERVICE_CHAINS_LIST_URL')),
    );
    data.forEach(({ id, metadata: { coingeckoPlatformId, coinmarketcapPlatformName } }) => {
      if (coingeckoPlatformId) {
        this.coingeckoPlatformChainIdEnum[coingeckoPlatformId] = id;
      }
      if (coinmarketcapPlatformName) {
        this.coinmarketcapPlatformChainIdEnum[coinmarketcapPlatformName] = id;
      }
    });
  }

  private runCoingecoTokenListRequest(): void {
    firstValueFrom(
      this.httpService.get(this.configService.get('COINGECKO_TOKEN_LIST_URL'), {
        params: {
          // eslint-disable-next-line camelcase
          include_platform: true,
        },
      }),
    ).then(this.processCoingeckoTokens.bind(this), (error) => this.logger.error(error));
  }

  private processCoingeckoTokens(coingeckoResponse: AxiosResponse): void {
    const coingeckoTokens: CoingeckoToken[] = coingeckoResponse.data;
    for (const { platforms } of coingeckoTokens) {
      Object.entries(platforms) //
        .forEach(([chain, address]) => {
          const chainId = this.coingeckoPlatformChainIdEnum[chain];
          if (!chainId) {
            this.logger.warn(`Unknown Coingecko chain! No platform: ${chain} in Database`);
          } else if (address) {
            this.assetsProcessor.processAsset({ address, chainId, isTracked: true });
          }
        });
    }
  }

  private runCoinmarketcapTokensRequest(start = 1): void {
    firstValueFrom(
      this.httpService.get(this.configService.get('COINMARKETCAP_TOKEN_LIST_URL'), {
        headers: {
          'X-CMC_PRO_API_KEY': this.configService.get('COINMARKETCAP_API_KEY'),
        },
        params: {
          limit: this.configService.get<number>('COINMARKETCAP_GET_TOKENS_LIMIT') || 1000,
          start,
          sort: 'cmc_rank',
        },
      }),
    ).then(this.processCoinmarketcapTokens.bind(this), (error) => this.logger.error(error));
  }

  private processCoinmarketcapTokens(coinmarketcapResponse: AxiosResponse): void {
    const coinmarketcapTokens: CoinmarketcapToken[] = coinmarketcapResponse.data.data;
    if (coinmarketcapTokens.length) {
      const { limit, start: previousStart } = coinmarketcapResponse.config.params;
      const start = limit + previousStart;
      if (start <= Number(process.env.COINMARKETCAP_TOKEN_LIST_LIMIT)) {
        // we need to run request to get next chunk
        this.runCoinmarketcapTokensRequest(start);
      }
      for (const { platform, rank } of coinmarketcapTokens) {
        const { name: chain, token_address: address } = platform || {};
        const chainId = this.coinmarketcapPlatformChainIdEnum[chain];
        if (!chainId) {
          this.logger.warn(`Unknown Coinmarketcap chain! No chain name: ${chain} in Database`);
        } else if (address) {
          this.assetsProcessor.processAsset({ address, chainId, rank, isTracked: true });
        }
      }
    }
  }
}
