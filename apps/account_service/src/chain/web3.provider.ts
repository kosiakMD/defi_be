import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common/enum';

@Injectable()
export class Web3Provider {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService) {
    this.providers[ChainIdEnum.eth] = new Web3(this.configService.get<string>('ETH_URL'));
    this.providers[ChainIdEnum.bsc] = new Web3(this.configService.get<string>('BSC_URL'));
    this.providers[ChainIdEnum.plg] = new Web3(this.configService.get<string>('POLYGON_URL'));
    this.providers[ChainIdEnum.ftm] = new Web3(this.configService.get<string>('FTM_URL'));
    this.providers[ChainIdEnum.avax] = new Web3(this.configService.get<string>('AVAX_URL'));
    this.providers[ChainIdEnum.arbi] = new Web3(this.configService.get<string>('ARBITRUM_URL'));
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }
  public instanceEth(): Web3 {
    return this.providers[ChainIdEnum.eth];
  }
  public instanceBsc(): any {
    return this.providers[ChainIdEnum.bsc];
  }
}
