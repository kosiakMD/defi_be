import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../../../common/Logger/Logger.service';
import { ScanService } from '../scan.service';
import { CHAIN_ID_ETH } from '../utils/utils';

@Injectable()
export class EtherScanService extends ScanService {
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly chainPrefix: 'bsc' | 'eth';

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(httpService, configService, cacheManager, logger);

    this.scanServiceUrl = this.configService.get<string>('ETHERSCAN_API_URL');
    this.scanServiceKey = this.configService.get<string>('ETHERSCAN_API_KEY');
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    this.chainId = CHAIN_ID_ETH;
    this.chainPrefix = 'eth';
  }
}
