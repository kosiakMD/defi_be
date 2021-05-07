import { HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CHAIN_ID_ETH } from '../../../utils/utils';
import { TransfersUpdateService } from '../transfersUpdate.service';

@Injectable()
export class EthTransferUpdateService extends TransfersUpdateService {
  protected readonly mainCoinAddress: string;
  protected readonly chainId: number;
  protected readonly servicePrefix: string;
  protected readonly transferTable: string;
  protected readonly startCrawlDate: number;
  protected readonly nativeAssetColumn: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(logger, httpService, configService);

    this.mainCoinAddress = this.configService.get<string>('PRICE_SERVICE_MAIN_COIN_ADDRESS');
    this.chainId = CHAIN_ID_ETH;
    this.transferTable = 'transactions';
    this.startCrawlDate = 1617006377779;
    this.servicePrefix = 'eth';
    this.nativeAssetColumn = 'ethprice';
  }
}
