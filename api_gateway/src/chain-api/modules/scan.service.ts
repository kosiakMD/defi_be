import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { Logger } from '../../common/Logger/Logger.service';
import { PriceServiceResponse } from '../models/interfaces/priceServiceResponse.interface';
import { ResultStatus, TransactionsResult } from '../models/interfaces/transactions.interfaces';
import { totalPrice } from './utils/utils';

export class ScanService {
  protected readonly getPricesUrl: string;
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly servicePrefix: string;

  constructor(
    protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
  }

  protected getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    return this.httpService
      .get(this.scanServiceUrl, {
        params: {
          module: 'account',
          action: action,
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: this.scanServiceKey,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getScanTransactions(address: string): Promise<TransactionsResult> {
    this.logger.time(`request: txlist & txlistinternal ${this.scanServiceUrl}`);
    const [normalTxResp, internalTxResp] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: txlist & txlistinternal ${this.scanServiceUrl}`);

    // TODO: format with no map but forEach and better check with default [] value
    const normalTx =
      normalTxResp && normalTxResp.result
        ? normalTxResp.result.map((tx) =>
            Object.assign(tx, { chainId: this.chainId, isInternal: false }),
          )
        : [];
    const internalTx =
      internalTxResp && internalTxResp.result
        ? internalTxResp.result.map((tx) =>
            Object.assign(tx, { chainId: this.chainId, isInternal: true }),
          )
        : [];
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return { status: ResultStatus.ok, transactions };

    const txTimestamps = transactions.map((tx) => tx.timeStamp);

    let prices: PriceServiceResponse;
    try {
      this.logger.time(`request: ${this.getPricesUrl}/chain=${this.chainId}`);
      prices = await this.httpService
        .post(this.getPricesUrl, {
          currency: 1,
          chain: this.chainId,
          addresses: [this.mainCoinAddress],
          timestamps: txTimestamps,
        })
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd(`request: ${this.getPricesUrl}/chain=${this.chainId}`);
    } catch (e) {
      let error = `Price Service Error: ${e.message}`;
      if (e.response) {
        this.logger.error(e.response.data);
        error += ' - ' + e.response.data.message;
      }
      this.logger.error(e.message);
      return {
        status: ResultStatus.error,
        error: error,
        transactions,
      };
    }

    transactions.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const priceUSD = prices.prices[this.mainCoinAddress][tx.timeStamp];
      Object.assign(tx, {
        [`${this.servicePrefix}PriceUSD`]: priceUSD,
        tokenPriceUSD: priceUSD,
        totalPriceUSD: totalPrice(tx.value.toString(), priceUSD, 18),
      });
    });

    return { status: ResultStatus.ok, transactions };
  }
}
