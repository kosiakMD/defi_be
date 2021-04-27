import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../../../common/Logger/Logger.service';
import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';
import { totalPrice, CHAIN_ID_BSC } from '../utils/utils';

@Injectable()
export class BscscanService {
  private readonly getPricesUrl: string;
  private readonly bscScanUrl: string;
  private readonly bscScanKey: string;
  private readonly chainId: number;
  private readonly mainCoinAddress: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;

    this.bscScanUrl = this.configService.get<string>('BSCSCAN_API_URL');
    this.bscScanKey = this.configService.get<string>('BSCSCAN_API_KEY');
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');

    this.chainId = CHAIN_ID_BSC;
  }
  private getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'txlist';
    return this.httpService
      .get(this.bscScanUrl, {
        params: {
          module: 'account',
          action: action,
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: this.bscScanKey,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getBscScanTransactions(address: string): Promise<any[]> {
    this.logger.time(`request: 2x ${this.bscScanUrl}`);
    const [bscTx, bscTxInternal] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: 2x ${this.bscScanUrl}`);

    const normalTx =
      bscTx && bscTx.result
        ? bscTx.result.map((tx) => Object.assign(tx, { isInternal: false }))
        : [];
    const internalTx =
      bscTxInternal && bscTxInternal.result
        ? bscTxInternal.result.map((tx) => Object.assign(tx, { isInternal: true }))
        : [];

    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return transactions;

    const txTimestamps = transactions.map((tx) => tx.timeStamp);

    this.logger.time(`request: ${this.getPricesUrl}/chain=2`);
    const bscTimestampPrices: PriceServiceResponse = await this.httpService
      .get(this.getPricesUrl, {
        params: {
          currency: 1,
          chain: this.chainId,
          addresses: this.mainCoinAddress,
          timestamps: txTimestamps.toString(),
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
    this.logger.timeEnd(`request: ${this.getPricesUrl}/chain=2`);

    transactions.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const bscPriceUSD = bscTimestampPrices.prices[this.mainCoinAddress][tx.timeStamp];
      Object.assign(tx, {
        bscPriceUSD: bscPriceUSD,
        totalPriceUSD: totalPrice(tx.value.toString(), bscPriceUSD, 18),
        chainId: this.chainId,
      });
    });

    return transactions;
  }
}
