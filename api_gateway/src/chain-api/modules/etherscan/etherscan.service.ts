import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../../../common/Logger/Logger.service';
import { CHAIN_ID_ETH, totalPrice } from '../utils/utils';

@Injectable()
export class EtherscanService {
  private readonly getPricesUrl: string;
  private readonly etherScanUrl: string;
  private readonly etherScanKey: string;
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

    this.etherScanUrl = this.configService.get<string>('ETHERSCAN_API_URL');
    this.etherScanKey = this.configService.get<string>('ETHERSCAN_API_KEY');
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    this.chainId = CHAIN_ID_ETH;
  }

  private getTransactions(address, internal = false): Promise<any> {
    const action = internal ? 'txlistinternal' : 'tokentx';
    return this.httpService
      .get(this.etherScanUrl, {
        params: {
          module: 'account',
          action: action,
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: this.etherScanKey,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getEtherScanTransactions(address: string): Promise<any[]> {
    this.logger.time(`request: tokentx & txlistinternal ${this.etherScanUrl}`);
    const [ethTx, ethTxInternal] = await Promise.all([
      this.getTransactions(address),
      this.getTransactions(address, true),
    ]);
    this.logger.timeEnd(`request: tokentx & txlistinternal ${this.etherScanUrl}`);

    const normalTx =
      ethTx && ethTx.result
        ? ethTx.result.map((tx) => Object.assign(tx, { isInternal: false, isError: 0 }))
        : [];
    const internalTx =
      ethTxInternal && ethTxInternal.result
        ? ethTxInternal.result.map((tx) => Object.assign(tx, { isInternal: true }))
        : [];
    const transactions = [].concat(normalTx, internalTx);

    if (!transactions.length) return transactions;

    const txTimestamps = transactions.map((tx) => tx.timeStamp);

    this.logger.time(`request: ${this.getPricesUrl}`);
    const ethTimestampPrices = await this.httpService
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
    this.logger.timeEnd(`request: ${this.getPricesUrl}`);

    transactions.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const ethPriceUSD = ethTimestampPrices.prices[this.mainCoinAddress][tx.timeStamp];
      Object.assign(tx, {
        ethPriceUSD: ethPriceUSD,
        totalPriceUSD: totalPrice(tx.value.toString(), ethPriceUSD, 18),
        chainId: this.chainId,
      });
    });

    return transactions;
  }
}
