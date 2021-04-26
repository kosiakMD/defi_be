import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../../../common/Logger/Logger.service';
import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';
import { totalPrice, CHAIN_ID_ETH } from '../utils/utils';

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

  async getEtherScanTransactions(address: string): Promise<PriceServiceResponse> {
    this.logger.time(`request: ${this.etherScanUrl}`);

    const ethTx = await this.httpService
      .get(this.etherScanUrl, {
        params: {
          module: 'account',
          action: 'tokentx',
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'asc',
          apikey: this.etherScanKey,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();

    const txTimestamps = ethTx.result.map((tx) => tx['timeStamp']);

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

    ethTx.result.forEach((tx) => {
      if (!Number(tx.value)) return false;
      const ethPriceUSD = ethTimestampPrices.prices[this.mainCoinAddress][tx.timeStamp];
      tx.ethPriceUSD = ethPriceUSD;
      tx.totalPriceUSD = totalPrice(tx.value.toString(), ethPriceUSD, 18);
      tx.chainId = this.chainId;
    });

    return ethTx.result;
  }
}
