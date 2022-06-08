import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainAbbrEnum, ChainNameEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { ChainsService } from '../../../../modules/chains/chains.service';
import { PriceService } from '../../microservices/price/price.service';
import { ScanApiService } from './scan.api.service';

@Injectable()
export class EtherScanService extends ScanApiService implements OnModuleInit {
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
    priceService: PriceService,
    private readonly chainsService: ChainsService,
  ) {
    super(httpService, configService, cacheManager, logger, priceService);

    this.url = this.configService.get<string>('ETHERSCAN_URL');
    this.apiKey = this.configService.get<string>('ETHERSCAN_KEY');
    this.chainAbbr = ChainAbbrEnum.eth;
    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
  }

  async onModuleInit() {
    this.chainId = await this.chainsService.getChainIdByName(ChainNameEnum.eth);
  }
}
