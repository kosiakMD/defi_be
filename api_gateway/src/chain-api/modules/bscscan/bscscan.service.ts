import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { Logger } from '../../../common/Logger/Logger.service';

import getBscscanTransactionQuery from '../../models/queries/BSCSCAN_GET_TRANSACTIONS'

import { PriceServiceResponse } from '../../models/interfaces/priceServiceResponse.interface';

@Injectable()
export class BscscanService { 
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  async getBscscanTransaction(addresses: string[]):Promise<PriceServiceResponse> {

    const bscTx = await this.httpService.get(
      getBscscanTransactionQuery(
        this.configService.get<string>('BSCSCAN_API_URL'),
        this.configService.get<string>('BSCSCAN_API_KEY'),
        addresses
      )).pipe(map((response) => response.data)).toPromise();
      
    return bscTx.result
  }
}
