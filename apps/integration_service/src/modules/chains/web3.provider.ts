import { Connection } from '@solana/web3.js';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainAbbrEnum } from '@app/common';

@Injectable()
export class Web3Provider {
  private readonly web3Map: Map<ChainAbbrEnum, Web3> = new Map<ChainAbbrEnum, Web3>();
  private readonly web3MapSol: Map<ChainAbbrEnum, Connection> = new Map<
    ChainAbbrEnum,
    Connection
  >();

  constructor(private readonly configService: ConfigService) {
    this.createChainProviders();
  }

  private createChainProviders() {
    const chainProviders: Record<string, ChainAbbrEnum> = {
      ['BSC_URL']: ChainAbbrEnum.bsc,
      ['ETH_URL']: ChainAbbrEnum.eth,
      ['FTM_URL']: ChainAbbrEnum.ftm,
      ['POLYGON_URL']: ChainAbbrEnum.plg,
      ['AVAX_URL']: ChainAbbrEnum.avax,
      ['SOL_URL']: ChainAbbrEnum.sol,
      ['ARBITRUM_URL']: ChainAbbrEnum.arbi,
      ['HARM_URL']: ChainAbbrEnum.harm,
    };
    Object.entries(chainProviders).forEach(([url, chain]) => {
      if (chain === ChainAbbrEnum.sol)
        this.web3MapSol.set(chain, new Connection(this.configService.get<string>(url)));
      else this.web3Map.set(chain, new Web3(this.configService.get<string>(url)));
    });
  }

  instanceSol(): Connection {
    return this.web3MapSol.get(ChainAbbrEnum.sol);
  }

  getForChain(chain: ChainAbbrEnum) {
    return this.web3Map.get(chain);
  }

  instanceEth(): Web3 {
    return this.web3Map.get(ChainAbbrEnum.eth);
  }
}
