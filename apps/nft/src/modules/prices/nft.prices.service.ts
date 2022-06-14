import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { IFetchPriceRequest } from '../../common/interfaces/fetch.price.request.interface';

import { LooksrarePricesProvider } from './providers/looksrare.prices.provider';
import { INftPricesProvider } from './providers/nft.prices.provider.interface';

@Injectable()
export class NftPricesService {
  readonly priceFetchers: Map<string, INftPricesProvider>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly looksrarePricesProvider: LooksrarePricesProvider,
  ) {
    this.priceFetchers = new Map([[looksrarePricesProvider.name, looksrarePricesProvider]]);
  }

  async fetchPrices(request: IFetchPriceRequest) {
    const prices = await Promise.all(
      Array.from(this.priceFetchers.entries()).map(([name, fetcher]) => {
        this.logger.debug(`fetch prices from ${name}`);
        return fetcher.fetchPrices(request);
      }),
    );
    //todo merge prices from different sources
    // + calculate total balance
    return prices[0];
  }
}
