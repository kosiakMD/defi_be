import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainIdEnum, ChainPrefixEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { PriceService } from '../price/price.service';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class PolygonScanService extends ScanApiService {
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainPrefix: ChainPrefixEnum;
  protected readonly chainId: ChainIdEnum;
  protected readonly mainCoinAddress: Address;

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
    priceService: PriceService,
  ) {
    super(httpService, configService, cacheManager, logger, priceService);

    this.url = this.configService.get<string>('POLYGONSCAN_URL');
    this.apiKey = this.configService.get<string>('POLYGONSCAN_KEY');
    this.chainPrefix = ChainPrefixEnum.polygon;
    this.chainId = ChainIdEnum.polygon;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }
}
