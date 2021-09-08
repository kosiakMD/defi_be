import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import Web3 from 'web3';

import { HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Web3Provider } from '../chain/web3.provider';
import { BLOCKS_INFO, ETH_BLOCKS } from '../utils/utils';
import { NodeService } from './node.service';

@Injectable()
export class EthService extends NodeService {
  protected blockIfoTable: string;
  protected blockTable: string;
  protected web3Provider: Web3;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: LoggerService,
    private web3ProviderService: Web3Provider,
  ) {
    super(httpService, configService, logger);
    this.blockIfoTable = BLOCKS_INFO;
    this.blockTable = ETH_BLOCKS;
    this.web3Provider = this.web3ProviderService.instanceEth();
  }
}
