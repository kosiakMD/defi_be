import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '..';

@Injectable()
export class Web3ProviderService {
  private readonly providers = new Map<ChainIdEnum, Web3>();

  constructor(private readonly configService: ConfigService) {
    this.setProvider(ChainIdEnum.eth, 'ETH_URL');
    this.setProvider(ChainIdEnum.bsc, 'BSC_URL');
    this.setProvider(ChainIdEnum.avax, 'AVAX_URL');
    this.setProvider(ChainIdEnum.plg, 'POLYGON_RPC_URL');
    this.setProvider(ChainIdEnum.ftm, 'FTM_URL');
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers.get(chain);
  }

  private setProvider(chain: ChainIdEnum, env: string) {
    this.providers.set(chain, new Web3(this.configService.get(env)));
  }
}
