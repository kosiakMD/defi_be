import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CHAIN_ID_ETH } from 'src/common/constatnt';
import { ChainIdEnum } from 'src/common/enum';

import { Logger } from '../Logger/Logger.service';
import { PriceService } from '../price/price.service';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class EtherScanService extends ScanApiService {
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainPrefix: 'bsc' | 'eth';
  protected readonly chainId: ChainIdEnum;
  protected readonly mainCoinAddress: string;

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
    priceService: PriceService,
  ) {
    super(httpService, configService, cacheManager, logger, priceService);

    this.url = this.configService.get<string>('ETHERSCAN_URL');
    this.apiKey = this.configService.get<string>('ETHERSCAN_KEY');
    this.chainPrefix = 'eth';
    this.chainId = CHAIN_ID_ETH;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }
}
