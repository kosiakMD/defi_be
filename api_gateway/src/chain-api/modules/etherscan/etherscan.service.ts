import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { Logger } from '../../../common/Logger/Logger.service';

import getEtherscanTransactionQuery from '../../models/queries/ETHERSCAN_GET_TRANSACTIONS'
import getEthTimestampPrice from '../../models/queries/GET_THE_TIMESTAMP_PRICE'
import { totalPrice } from '../utils/utils';

import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';

@Injectable()
export class EtherscanService { 
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async getEtherscanTransaction(addresses: string[]):Promise<PriceServiceResponse> {
    const ethTx = await this.httpService.get(
      getEtherscanTransactionQuery(
        this.configService.get<string>('ETHERSCAN_API_URL'),
        this.configService.get<string>('ETHERSCAN_API_KEY'),
        addresses
      )).pipe(map((response) => response.data)).toPromise();

    const txTimestamps = ethTx.result.map(tx => tx["timeStamp"])

    const ethTimestampPrices = await this.httpService.get(
      getEthTimestampPrice(
        `${this.configService.get<string>('PRICE_SERVICE_HOST')}/${this.configService.get<string>('PRICES_PATH')}`,
        txTimestamps
      )).pipe(map((response) => response.data)).toPromise();

    ethTx.result.forEach((tx)=> {
      if(!Number(tx.value)) return false;
      const ethPriceUSD = ethTimestampPrices.prices[this.configService.get<string>('PRICE_SERVICE_ETH_ADDRESS')][tx.timeStamp]
      tx.ethPriceUSD = ethPriceUSD;
      tx.totalPriceUSD = totalPrice(tx.value.toString(), ethPriceUSD, 18)
    })

    return ethTx.result
  }
}
