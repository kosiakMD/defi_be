import { Web3Provider } from '@ethersproject/providers';
import { getHashedName, getNameAccountKey, NameRegistryState } from '@solana/spl-name-service';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '..';

import { TNS } from '@tns-money/tns.js';

// const tns = new TNS();

@Injectable()
export class Web3NameService {
  private readonly providers = new Map<
    {
      chain: ChainIdEnum;
      resolver: (s: string, p: Web3Provider | Connection | TNS) => Promise<string>;
    },
    Web3Provider | Connection | TNS
  >();
  private readonly SOL_TLD_AUTHORITY: PublicKey;

  constructor(private readonly configService: ConfigService) {
    this.setEvmProvider(ChainIdEnum.eth, 'ETH_URL');
    this.setSolanaProvider(ChainIdEnum.sol, 'SOL_URL');
    this.SOL_TLD_AUTHORITY = new PublicKey(
      this.configService.get('SOLANA_NAME_SERVICE_PUBLIC_KEY'),
    );
    this.setTnsProvider(ChainIdEnum.terra);
  }

  private async resolveEnsName(name: string, provider: Web3Provider): Promise<Address> {
    try {
      return await provider.resolveName(name);
    } catch {
      return null;
    }
  }

  private async resolveSnsName(name: string, connection: Connection): Promise<string> {
    try {
      const parsedName = name.replace('.sol', '');
      const hashedName = await getHashedName(parsedName);
      const domainKey = await getNameAccountKey(hashedName, undefined, this.SOL_TLD_AUTHORITY);
      const registry = await NameRegistryState.retrieve(connection, domainKey);
      return registry.owner.toBase58();
    } catch {
      return null;
    }
  }

  private async resolveTnsName(name: string, tns: TNS): Promise<string> {
    return tns.name(name).getTerraAddress().catch(() => null);
  }

  private setEvmProvider(chain: ChainIdEnum, env: string) {
    const mainnetHTTPProvider = new Web3.providers.HttpProvider(this.configService.get(env));
    this.providers.set(
      { chain, resolver: this.resolveEnsName },
      new ethers.providers.Web3Provider(mainnetHTTPProvider),
    );
  }

  private setSolanaProvider(chain: ChainIdEnum, env: string) {
    this.providers.set(
      { chain, resolver: this.resolveSnsName.bind(this) },
      new Connection(this.configService.get(env)),
    );
  }

  private setTnsProvider(chain: ChainIdEnum) {
    this.providers.set(
      { chain, resolver: this.resolveTnsName.bind(this) },
      new TNS(),
    );
  }

  public async resolveName(name: string): Promise<string> {
    for await (const [{ resolver }, provider] of this.providers) {
      const address = await resolver(name, provider);
      if (address) {
        return address;
      }
    }
    return null;
  }
}
