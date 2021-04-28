import { Inject, Injectable, LoggerService, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { getManager } from 'typeorm';

import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';
import getLastTransactionId from '../../models/queries/GET_LAST_ETH_TRANSACTION_ID';
import getUnPricedEthTransactions from '../../models/queries/GET_UPRICED_ETH_TRANSACTIONS';
import updateEthPrices from '../../models/queries/UPDATE_ETH_PRICES';

export type TokenAddresses = { [key: string]: number };

@Injectable()
export class EthTransactionPriceService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async getEthPrice(timestamps: Array<any>): Promise<PriceServiceResponse> {
    return this.httpService
      .get(
        `${this.configService.get<string>(
          'PRICE_SERVICE_ENDPOINT',
        )}?currencyId=1&chainId=1&addresses=${this.configService.get<string>(
          'PRICE_SERVICE_ETH_ADDRESS',
        )}&timestamps=${timestamps}`,
      )
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async updateEthTransactionPrices(entityManager, offset): Promise<void> {
    try {
      const unpricedTransactions = await entityManager.query(getUnPricedEthTransactions(offset));

      const ethTxs = {
        hashes: [],
        timestamps: [],
      };
      for (const tx of unpricedTransactions) {
        if (!ethTxs.hashes.includes(tx.hash)) {
          ethTxs.hashes.push(tx.hash);
          ethTxs.timestamps.push(tx.blockTimestamp);
        }
      }
      const ethPrices = await this.getEthPrice(ethTxs.timestamps);

      const prices = unpricedTransactions.map(
        (tx) =>
          `('${tx.hash}', ${
            ethPrices.prices[this.configService.get<string>('PRICE_SERVICE_ETH_ADDRESS')][
              tx.blockTimestamp
            ]
          })`,
      );

      await entityManager.query(updateEthPrices(prices));
    } catch (e) {
      this.logger.error(e, 'Transaction price update error');
    }
  }

  public async updateTransactionPrices(): Promise<void> {
    let offset;
    const entityManager = getManager();
    const lastTransactionId = await entityManager.query(getLastTransactionId());
    for (offset = 0; offset < Number(lastTransactionId[0].id); offset = offset + 500) {
      await this.updateEthTransactionPrices(entityManager, offset);
    }
  }
}
