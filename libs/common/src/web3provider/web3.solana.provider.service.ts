import { Connection } from '@solana/web3.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '..';

@Injectable()
export class Web3SolanaProviderService {
  private readonly providers = new Map<ChainIdEnum, Connection>();

  constructor(private readonly configService: ConfigService) {
    this.setProvider(ChainIdEnum.sol, 'SOL_URL');
  }

  public getInstanceByChainId(chain: ChainIdEnum): Connection {
    return this.providers.get(chain);
  }

  private setProvider(chain: ChainIdEnum, env: string) {
    this.providers.set(chain, new Connection(this.configService.get(env)));
  }
}
