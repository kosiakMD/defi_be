import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainAbbrEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { PriceService } from '../../microservices/price/price.service';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class BscScanService extends ScanApiService {
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainAbbr: ChainAbbrEnum;
  protected readonly chainId: number;
  protected readonly mainCoinAddress: Address;

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
    this.chainAbbr = ChainAbbrEnum.bnb;
    this.chainId = 2;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }
}
