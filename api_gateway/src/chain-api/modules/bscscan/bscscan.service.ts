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

  async getBscScanTransactions(address: string): Promise<PriceServiceResponse> {
    this.logger.time(`request: ${this.bscScanUrl}`);

    const [bscTx, bscTxInternal] = await Promise.all([
      this.httpService
        .get(this.bscScanUrl, {
          params: {
            module: 'account',
            action: 'txlist',
            address: address,
            startblock: 1,
            endblock: 99999999,
            sort: 'asc',
            apikey: this.bscScanKey,
          },
        })
        .pipe(map((response) => response.data))
        .toPromise(),
      this.httpService
        .get(this.bscScanUrl, {
          params: {
            module: 'account',
            action: 'txlistinternal',
            address: address,
            startblock: 1,
            endblock: 99999999,
            sort: 'asc',
            apikey: this.bscScanKey,
          },
        })
        .pipe(map((response) => response.data))
        .toPromise(),
    ]);

    if (Number(bscTxInternal.status) && Number(bscTx.status)) {
      bscTx.result.concat(bscTxInternal.result);
    }

    const txTimestamps = bscTx.result.map((tx) => tx['timeStamp']);
    this.logger.time(`request: ${this.getPricesUrl}/chain=2`);

    const bscTimestampPrices = await this.httpService
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

    bscTx.result.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const bscPriceUSD = bscTimestampPrices.prices[this.mainCoinAddress][tx.timeStamp];
      tx.bscPriceUSD = bscPriceUSD;
      tx.totalPriceUSD = totalPrice(tx.value.toString(), bscPriceUSD, 18);
    });

    return bscTx.result;
  }
}
