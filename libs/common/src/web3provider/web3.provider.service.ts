import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '..';

@Injectable()
export class Web3ProviderService {
  private readonly providers = new Map<ChainIdEnum, Web3>();

  constructor(private readonly configService: ConfigService) {
    this.providers.set(ChainIdEnum.eth, new Web3(this.configService.get<string>('ETH_URL')));
    this.providers.set(ChainIdEnum.bsc, new Web3(this.configService.get<string>('BSC_URL')));
    this.providers.set(
      ChainIdEnum.plg,
      new Web3(this.configService.get<string>('POLYGON_RPC_URL')),
    );
    this.providers.set(ChainIdEnum.ftm, new Web3(this.configService.get<string>('FTM_URL')));
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers.get(chain);
  }
}
