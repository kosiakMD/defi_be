import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainAbbrEnum, ChainNameEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { AssetsService } from '../../../../modules/assets/assets.service';
import { ChainsService } from './../../../../modules/chains/chains.service';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class BscScanService extends ScanApiService implements OnModuleInit {
  protected readonly url: string;
  protected readonly apiKey: string;
  protected readonly chainAbbr: ChainAbbrEnum;
  protected chainId: number;
  protected readonly mainCoinAddress: Address;

  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) logger: Logger,
    private readonly chainsService: ChainsService,
    assetsService: AssetsService,
  ) {
    super(httpService, configService, cacheManager, logger, assetsService);

    this.url = this.configService.get<string>('BSCSCAN_URL');
    this.apiKey = this.configService.get<string>('BSCSCAN_KEY');
    this.chainAbbr = ChainAbbrEnum.bnb;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }

  async onModuleInit() {
    this.chainId = await this.chainsService.getChainIdByName(ChainNameEnum.bnb);
  }
}
