import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { Connection } from '@solana/web3.js';
import { LCDClient } from '@terra-money/terra.js';
import { ChainsService } from 'apps/account_service/src/modules/chains/chains.service';
import Web3 from 'web3';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainNameEnum } from '@app/common/enum';

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

  public getCardanoInstance(chain: number): BlockFrostAPI {
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

    const cardanoId = await this.chainsService.getChainIdByName(ChainNameEnum.cardano);
    this.providers[cardanoId] = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });

    for (const chain of chains) {
      if (!this.providers[chain.id]) {
        const configName = `${chain.name.toUpperCase()}_URL`;
        this.providers[chain.id] = new Web3(this.configService.get(configName));
      }
    }
  }
}
