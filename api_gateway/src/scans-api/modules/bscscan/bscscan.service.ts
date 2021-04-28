import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../../../common/Logger/Logger.service';
import { ScanService } from '../scan.service';
import { CHAIN_ID_BSC } from '../utils/utils';

@Injectable()
export class BscscanService extends ScanService {
  protected readonly getPricesUrl: string;
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly servicePrefix: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(logger, httpService, configService);

    this.scanServiceUrl = this.configService.get<string>('BSCSCAN_API_URL');
    this.scanServiceKey = this.configService.get<string>('BSCSCAN_API_KEY');
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    this.chainId = CHAIN_ID_BSC;
    this.servicePrefix = 'bsc';
  }
}
