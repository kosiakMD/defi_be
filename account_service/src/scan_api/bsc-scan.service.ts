import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../Logger/Logger.service';
import { PriceService } from '../price/price.service';
import { CHAIN_ID_BSC } from '../utils/utils';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class BscScanService extends ScanApiService {
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainPrefix: 'bsc' | 'eth';
  protected readonly chainId: number;
  protected readonly mainCoinAddress: string;

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
    priceService: PriceService,
  ) {
    super(httpService, configService, cacheManager, logger, priceService);

    this.url = this.configService.get<string>('BSCSCAN_URL');
    this.apiKey = this.configService.get<string>('BSCSCAN_KEY');
    this.chainPrefix = 'bsc';
    this.chainId = CHAIN_ID_BSC;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }
}
