import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ChainAbbrEnum, ChainIdEnum } from '@app/common/enum';

import { ScanService } from '../scan.service';
import { CHAIN_ID_BSC } from '../utils/utils';

@Injectable()
export class BscScanService extends ScanService {
  protected readonly scanServiceUrl: string;
  protected readonly scanServiceKey: string;
  protected readonly mainCoinAddress: string;
  protected readonly chainId: ChainIdEnum;
  protected readonly chainPrefix: ChainAbbrEnum;

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
    this.chainPrefix = ChainAbbrEnum.bnb;
  }
}
