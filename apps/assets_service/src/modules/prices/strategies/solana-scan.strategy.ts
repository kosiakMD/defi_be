import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common/enum';
import { delay } from '@app/common/helpers/delay';
import { ChainCoinAddresses } from '@app/common/utils/chains';

import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type SolanaToken = {
  mintAddress: string;
  priceUst: number;
};

type Config = {
  maxItems?: number;
  chunkSize?: number;
  requestDelay?: number;
};

export class SolanaScanStrategy extends BaseStrategy<Config> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  public async fetchPrices({ sourceId, config }: PriceSource<Config>): Promise<AssetPrice[]> {
    const { maxItems = 500, chunkSize = 50, requestDelay = 2 * 1000 } = config;

    let prices: AssetPrice[] = [];

    let skip = 0;
    while (skip < maxItems) {
      await delay(requestDelay);

      const chunkPrices = await this.getChunkPrices(sourceId, chunkSize, skip);
      prices = prices.concat(chunkPrices);

      skip += chunkSize;
    }

    return prices;
  }

  private async getChunkPrices(sourceId: number, chunkSize: number, skip: number) {
    const {
      data: { data: assets },
    } = await firstValueFrom(
      this.httpService.get<{ data: SolanaToken[] }>(`https://public-api.solscan.io/token/list`, {
        params: {
          sortBy: 'market_cap',
          direction: 'desc',
          limit: chunkSize,
          offset: skip,
        },
      }),
    );

    return assets.map((token) => ({
      address: mapAssetAddress(token.mintAddress),
      chainId: ChainIdEnum.sol,
      sourceId,
      price: token.priceUst,
    }));
  }
}

function mapAssetAddress(address: string) {
  return address === 'So11111111111111111111111111111111111111112'
    ? ChainCoinAddresses[ChainIdEnum.sol]
    : address;
}
