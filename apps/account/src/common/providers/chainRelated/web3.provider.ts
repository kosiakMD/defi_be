import { Connection } from '@solana/web3.js';
import { LCDClient } from '@terra-money/terra.js';
import { ChainsService } from 'apps/account/src/modules/chains/chains.service';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainNameEnum } from '@app/common/enum';
import Web3 from '@app/common/web3provider/web3';

@Injectable()
export class Web3Provider implements OnModuleInit {
  private readonly providers = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly chainsService: ChainsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initWeb3Providers();
  }

  public async getInstanceByChainId(chain: number) {
    return this.providers[chain];
  }

  public getInstance(chain: number): Connection {
    return this.providers[chain];
  }

  private async initWeb3Providers() {
    const chains = await this.chainsService.getAll();

    const solId = await this.chainsService.getChainIdByName(ChainNameEnum.sol);
    this.providers[solId] = new Connection(this.configService.get<string>('SOLANA_URL'));

    const terraId = await this.chainsService.getChainIdByName(ChainNameEnum.terra);
    this.providers[terraId] = new LCDClient({
      URL: this.configService.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });

    for (const chain of chains) {
      if (!this.providers[chain.id]) {
        const configName = `${chain.name.toUpperCase()}_URL`;
        this.providers[chain.id] = new Web3(this.configService.get(configName));
      }
    }
  }
}
