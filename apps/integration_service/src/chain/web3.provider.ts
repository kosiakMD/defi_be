import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainAbbrEnum } from '@app/common';

@Injectable()
export class Web3Provider {
  private readonly web3Map: Map<ChainAbbrEnum, Web3> = new Map<ChainAbbrEnum, Web3>();

  constructor(private readonly configService: ConfigService) {
    this.createChainProviders();
  }

  private createChainProviders() {
    const chainProviders: Record<string, ChainAbbrEnum> = {
      ['BSC_URL']: ChainAbbrEnum.bsc,
      ['ETH_URL']: ChainAbbrEnum.eth,
      ['FTM_RPC_URL']: ChainAbbrEnum.ftm,
      ['POLYGON_RPC_URL']: ChainAbbrEnum.plg,
    };
    Object.entries(chainProviders).forEach(([url, chain]) => {
      this.web3Map.set(chain, new Web3(this.configService.get<string>(url)));
    });
  }

  getForChain(chain: ChainAbbrEnum) {
    return this.web3Map.get(chain);
  }

  instanceEth(): Web3 {
    return this.web3Map.get(ChainAbbrEnum.eth);
  }

  instanceBsc(): Web3 {
    return this.web3Map.get(ChainAbbrEnum.bsc);
  }

  instanceFtm(): Web3 {
    return this.web3Map.get(ChainAbbrEnum.ftm);
  }
}
