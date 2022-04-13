import { ClassConstructor } from 'class-transformer';

import { ModuleRef } from '@nestjs/core';

import { Address, ChainId, ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { groupBy } from '@app/common/utils';

import { getChainById } from '../../common/utils/chain';

import {
  IChainGroupedWallet,
  IChainUserEntry,
  IPlatformMeta,
  IPlatformUserEntry,
  IProtocolMeta,
  IRootPlatform,
  IRootProtocol,
  IWalletOpportunity,
  IWalletUserEntry,
} from './interfaces';

export abstract class RootPlatform implements IRootPlatform {
  protected abstract logger: Logger;
  protected abstract moduleRef: ModuleRef;
  private registrationLocked = false;

  abstract register(): Promise<void>;
  // Meta Registration
  protected meta: Omit<IPlatformMeta, 'features'>;
  protected registerMeta(meta: Omit<IPlatformMeta, 'features'>) {
    this.meta = Object.assign(this.meta ?? {}, meta);
  }

  // Component Registration
  protected protocols: Set<IRootProtocol> = new Set();
  protected async registerProtocol(protocol: ClassConstructor<IRootProtocol>, meta: IProtocolMeta) {
    const instance = await this.moduleRef.create(protocol);
    instance.registerMeta(meta);
    await instance.initialize();
    if (this.registrationLocked) {
      return this.logger.error(
        `Protocol Registration occurred after platform has been initialized. Likely forgot 'await' in platforms register handle`,
        new Error('Protocol registered after initialized').stack,
        this.constructor.name,
      );
    }

    this.protocols.add(instance);
  }

  async initialize() {
    await this.register();
    this.registrationLocked = true;
  }

  getMeta(): IPlatformMeta {
    // Loop through all supported protocols
    // dedupe & merge
    const features = new Map<ChainId, Set<FeatureEnum>>();
    this.protocols.forEach((protocol) => {
      const meta = protocol.getMeta();
      if (features.has(meta.chain.id)) {
        meta.list.forEach((feature) => features.get(meta.chain.id).add(feature));
      } else {
        features.set(meta.chain.id, new Set(meta.list));
      }
    });

    return {
      name: this.meta.name,
      project: this.meta.name, // why do we need both, what are clear definitions of both
      features: Array.from(features.entries()).map(([chain, list]) => ({
        chain: getChainById(chain),
        list: Array.from(list),
      })),
    };
  }

  async getUsersData(
    chains: ChainId[],
    addresses: Address[],
  ): Promise<[IPlatformUserEntry[], Error[]]> {
    const promises: Promise<IChainGroupedWallet>[] = [];
    const errors: Error[] = [];
    const supportedChains = new Set();
    this.protocols.forEach((protocol) => {
      const { chain, list: features } = protocol.getMeta();
      supportedChains.add(chain.id);
      // TODO: Validate user address per protocol i.e. protocol.isValidAddress(address)
      // (EVM vs non-evm likely)
      if (!chains.includes(chain.id)) {
        return;
      }

      promises.push(
        protocol.getUsersData(addresses).then(([wallets, userErrors]) => {
          errors.push(...userErrors);
          return { chain, features, wallets, errors };
        }),
      );
    });

    // Add error messages for unsupported chains
    chains.forEach((chain) => {
      if (!supportedChains.has(chain)) {
        errors.push(new Error(`Protocol does not support Chain: ${chain}`));
      }
    });

    const resolvedProtocols = await Promise.all(promises);
    const wallets = addresses.map((address) => {
      const chainData = chains.map((chain) =>
        this.mergeUserProtocolDataPerChain(address, chain, resolvedProtocols),
      );

      return {
        address,
        total: this.getWalletTotal(chainData),
        chains: chainData,
      };
    });

    return [wallets, errors];
  }

  async getPoolData(chains: ChainId[]): Promise<[IWalletOpportunity[], Error[]]> {
    const promises = [];
    const errors: Error[] = [];
    const supportedChains = new Set();
    this.protocols.forEach((protocol) => {
      const { chain } = protocol.getMeta();
      supportedChains.add(chain.id);
      if (chains.includes(chain.id)) {
        promises.push(protocol.getPoolData());
      }
    });

    // Add error messages for unsupported chains
    chains.forEach((chain) => {
      if (!supportedChains.has(chain)) {
        errors.push(new Error(`Protocol does not support Chain: ${chain}`));
      }
    });

    const protocolResults = await Promise.allSettled(promises);
    const protocols: IWalletOpportunity[] = [];

    protocolResults.forEach((protocol) => {
      switch (protocol.status) {
        case 'fulfilled':
          protocols.push(...protocol.value[0]);
          errors.push(...protocol.value[1]);
          break;
        case 'rejected':
          errors.push(protocol.reason);
          break;
      }
    });
    return [protocols, errors];
  }

  async cachePoolData(chains: ChainId[]) {
    const promises = [];
    this.protocols.forEach((protocol) => {
      const { chain } = protocol.getMeta();
      if (chains.includes(chain.id)) {
        promises.push(protocol.cachePoolData());
      }
    });

    const resolvedProtocols = await Promise.allSettled(promises);

    const protocols = [];
    const errors = [];
    resolvedProtocols.forEach((protocol) => {
      switch (protocol.status) {
        case 'fulfilled':
          protocols.push(protocol.value);
          break;
        case 'rejected':
          errors.push(protocol.reason);
          break;
      }
    });
    return [protocols, errors];
  }

  /*****
   * Private Helpers
   */

  private getPositionsTotal(positions: any[]): number {
    return positions.reduce((total, position) => {
      if ('supplied' in position) {
        total += position.supplied.reduce((tokenAcc, token) => {
          if (!token.value) {
            return tokenAcc;
          }
          return tokenAcc + token.value;
        }, 0);
      }

      if ('rewarded' in position) {
        total += position.rewarded.reduce((tokenAcc, token) => {
          if (!token.value) {
            return tokenAcc;
          }
          return tokenAcc + token.value;
        }, 0);
      }

      if ('borrowed' in position) {
        total -= position.borrowed.reduce((tokenAcc, token) => {
          if (!token.value) {
            return tokenAcc;
          }
          return tokenAcc + token.value;
        }, 0);
      }

      return total;
    }, 0);
  }

  /**
   * Calculates the total $$ value of a wallet across
   * all chains
   *
   * @param chains
   * @returns
   */
  private getWalletTotal(chains: any[]): number {
    return chains.reduce((total, chain) => {
      return total + chain.total;
    }, 0);
  }

  /**
   * merges user positions across protocols into a single array
   * then groups them into an object based on feature.
   * Also builds a list of all supported features, and calculates
   * chain total
   *
   * @param user
   * @param chain
   * @param resolvedProtocols
   * @returns
   */
  private mergeUserProtocolDataPerChain(
    user: Address,
    chain: ChainIdEnum,
    resolvedProtocols: IChainGroupedWallet[],
  ): IChainUserEntry {
    const positions: IWalletUserEntry[] = [];
    const features = new Set<Partial<FeatureEnum>>();

    resolvedProtocols.forEach((protocol) => {
      if (protocol.chain.id !== chain) return;
      protocol.features.forEach((feature) => features.add(feature));
      positions.push(...protocol.wallets.get(user));
    });
    const total = this.getPositionsTotal(positions);
    const positionsByFeature = Object.fromEntries(groupBy(positions, (i) => i.feature).entries());
    features.forEach((feature) => {
      if (!positionsByFeature[feature]) {
        // feature groups will always be present
        positionsByFeature[feature] = [];
      }
    });
    return {
      // group positions by feature  { staking: [....], lending: [...] }
      positions: positionsByFeature,
      features: Array.from(features),
      total,
      chain: getChainById(chain),
    };
  }
}
