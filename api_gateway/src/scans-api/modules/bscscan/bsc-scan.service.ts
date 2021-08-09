import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ScanService } from '../scan.service';
import { CHAIN_ID_BSC } from '../utils/utils';
import { Logger } from 'src/common/Logger/Logger.service';
import { ChainIdEnum, ChainPrefixEnum } from 'src/common/enum';

@Injectable()
export class BscScanService extends ScanService {
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: ChainIdEnum;
  protected readonly chainPrefix: ChainPrefixEnum;

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
  ) {
    super(httpService, configService, cacheManager, logger);

    this.scanServiceUrl = this.configService.get<string>('BSCSCAN_API_URL');
    this.scanServiceKey = this.configService.get<string>('BSCSCAN_API_KEY');
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    this.chainId = CHAIN_ID_BSC;
    this.chainPrefix = ChainPrefixEnum.bsc;
  }
}
