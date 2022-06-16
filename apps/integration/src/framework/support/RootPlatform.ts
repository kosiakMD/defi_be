// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ClassConstructor } from 'class-transformer';

import { ModuleRef } from '@nestjs/core';

import { Address, ChainId, ChainIdEnum, Logger } from '@app/common';
import { groupBy, keepAddressesByChainId } from '@app/common/utils';
import { getChainById } from '@app/common/utils';

import { FeatureEnum } from './enums';
import {
  IChainGroupedWallet,
  IChainUserEntry,
  IPlatformMeta,
  IPoolDataPlatformResponse,
  IProtocolMeta,
  IRootPlatform,
  IRootProtocol,
  IUserDataPlatformResponse,
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
  // To get a decluttered list from defilama
  // $ curl https://api.llama.fi/protocols | jq '.[] | to_entries | map(select(.key | in({ name: true, twitter: true, url: true, logo: true }) )) | from_entries'
  protected protocols: Set<IRootProtocol> = new Set();
  protected protocolErrors: Map<IRootProtocol, Error> = new Map();

  protected async registerProtocol<TProtocolMeta extends IProtocolMeta = IProtocolMeta>(
    protocol: ClassConstructor<IRootProtocol>,
    meta: TProtocolMeta,
  ) {
    // Register protocol with regular dependency injection enabled
    const instance = await this.moduleRef.create(protocol);

    // Assign metadata to protocol
    instance.registerMeta(meta);

    // Run initialization if required.
    // this sets all required function predicates and ABI items
    // this is needed to happen infrequently (currently once at boot)
    // but isn't strictly required to register as the 'meta' has all the info
    // needed to display the list of protocols.
    // Pros of including here
    //   - runs once at start and is done
    //   - central for all protocols/platforms
    //   - if a protocol fails to load for any reason it can automatically be removed from the protocols list
    // Cons
    //   - slow to start
    //   - requests many ABI's at once so higher chance of rate limits (assuming protocol list is the first request)
    //   - means registerProtocol needs to be async
    // Possible solution:
    // seperate 'register' and 'boot' actions. Register is called to list
    // the protocol list, however doesn't touch the ABI's or predicates etc.
    // boot is run every getPools or getUserData, however it will usually
    // be loaded from cache so performance impact to users should be minimal
    // + faster startup times, faster protocols-list time
    // - potentially slower getUserData time

    // All protocols would be listed, and failed ones would display an error
    // (or retry_ when accessed instead of simply being absent after boot

    // TODO: initialize could be replaced with proper nestjs lifecycle hooks
    // https://docs.nestjs.com/fundamentals/lifecycle-events#lifecycle-events-1
    if (instance.initialize) {
      try {
        this.logger.log(
          `Initializing: ${meta.name} Chain: ${meta.chain}`,
          `${this.constructor.name}/${instance.constructor.name}`,
        );

        await instance.initialize();
      } catch (err) {
        this.protocolErrors.set(instance, err);
        this.logger.error(err.message, err.stack, 'RootPlatform');
        return;
      }
    }
    if (this.registrationLocked) {
      return this.logger.error(
        `Protocol Registration occurred after platform has been initialized. Likely forgot 'await' in platforms register handle`,
        new Error('Protocol registered after initialized').stack,
        this.constructor.name,
      );
    }

    this.protocols.add(instance);
  }

  // if seperated as commented above, register could be sync and
  // registrationLocked would not be required
  async initialize() {
    await this.register();
    this.registrationLocked = true;
  }

  getMeta(): IPlatformMeta {
    // Loop through all supported protocols
    // dedupe & merge
    // TODO: Comment that out as cannot switch log level (to be reverted)
    // this.logger.debug(`Start getting meta for: ${this.meta.name}`);

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
      name: this.meta.name, // human readable name
      slug: this.meta.slug, // slug/key
      features: Array.from(features.entries()).map(([chain, list]) => ({
        chain: getChainById(chain),
        list: Array.from(list),
      })),
      links: this.meta.links || {},
    };

    // TODO: Comment that out as cannot switch log level (to be reverted)
    // this.logger.debug(`Finish getting meta for: ${this.meta.name}`);
  }
  private async validatedProtocols(): Promise<[Set<IRootProtocol<IProtocolMeta>>, Error[]]> {
    const errors: Error[] = [];

    if (!this.protocolErrors.size) return [this.protocols, errors];

    for (const [protocol] of this.protocolErrors) {
      try {
        await protocol.initialize();
        this.protocolErrors.delete(protocol);
        this.protocols.add(protocol);
      } catch (err) {
        errors.push(err);
      }
    }
    return [this.protocols, errors];
  }

  async getUsersData(chains: ChainId[], addresses: Address[]): Promise<IUserDataPlatformResponse> {
    const [protocols, errors] = await this.validatedProtocols(); // TODO: for performance, we could only retry failed protocols during sync

    this.logger.log(`Start getting user data for: ${this.meta.name}`);

    const promises: Promise<IChainGroupedWallet>[] = [];
    const supportedChains = new Set();
    protocols.forEach((protocol) => {
      const { chain, list: features } = protocol.getMeta();
      supportedChains.add(chain.id);

      if (!chains.includes(chain.id) || !protocol.getUsersData) {
        return;
      }

      const validAddressesForChain = keepAddressesByChainId(addresses, chain.id);

      if (validAddressesForChain.length !== addresses.length) {
        this.logger.warn(
          `${addresses.length - validAddressesForChain.length} Addresses removed from ${
            this.meta.name
          }`,
        );
      }

      const started = Date.now();
      if (validAddressesForChain?.length) {
        promises.push(
          protocol
            .getUsersData(validAddressesForChain)
            .then(({ data: wallets, errors: userErrors }) => {
              this.logger.log({
                message: `Protocol data loaded`,
                platform: this.meta.name,
                chainId: chain.id,
                address: validAddressesForChain,
                execution: Date.now() - started,
              });
              errors.push(...userErrors);
              return { chain, features, wallets, errors };
            }),
        );
      }
    });

    // Add error messages for unsupported chains
    chains.forEach((chain) => {
      if (!supportedChains.has(chain)) {
        errors.push(new Error(`Protocol does not support Chain: ${chain}`));
      }
    });

    this.logger.log(`Trying to get user data for: ${this.meta.name}`);

    const resolvedProtocolsResults = await Promise.allSettled(promises);
    const resolvedProtocols = [];
    resolvedProtocolsResults.forEach((r) => {
      if (r.status === 'fulfilled') {
        resolvedProtocols.push(r.value);
      } else {
        errors.push(r.reason);
      }
    });

    this.logger.log(`Formatting fetched data for: ${this.meta.name}`);

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

    this.logger.log(`Finish getting user data for: ${this.meta.name}`);

    return { data: wallets, errors };
  }

  async getPoolData(chains: ChainId[]): Promise<IPoolDataPlatformResponse> {
    const [protocols, errors] = await this.validatedProtocols();
    this.logger.log(`Start getting pool data: ${this.meta.name}`);

    const promises = [];
    const supportedChains = new Set();
    protocols.forEach((protocol) => {
      const { chain } = protocol.getMeta();
      supportedChains.add(chain.id);
      if (chains.includes(chain.id)) {
        promises.push(protocol.getFormattedPoolData?.() ?? protocol.getPoolData());
      }
    });

    // Add error messages for unsupported chains
    chains.forEach((chain) => {
      if (!supportedChains.has(chain)) {
        errors.push(new Error(`Protocol does not support Chain: ${chain}`));
      }
    });

    const protocolResults = await Promise.allSettled(promises);
    const userProtocols: IWalletOpportunity[] = [];

    this.logger.log(`Start formatting pool data: ${this.meta.name}`);

    protocolResults.forEach((protocol) => {
      switch (protocol.status) {
        case 'fulfilled':
          userProtocols.push(...protocol.value.data);
          errors.push(...protocol.value.errors);
          break;
        case 'rejected':
          errors.push(protocol.reason);
          break;
      }
    });

    this.logger.log(`Finishing getting pool data: ${this.meta.name}`);
    return { data: userProtocols, errors };
  }

  async cachePoolData(chains: ChainId[]) {
    this.logger.log(`Start caching pool data: ${this.meta.name}`);
    const promises = [];
    this.protocols.forEach((protocol) => {
      const { chain } = protocol.getMeta();
      if (chains.includes(chain.id) && protocol.cachePoolData) {
        promises.push(protocol.cachePoolData());
      }
    });

    const resolvedProtocols = await Promise.allSettled(promises);

    this.logger.log(`Pool data cached: ${this.meta.name}`);

    const protocols = [];
    const errors: Error[] = [];
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

    this.logger.log(`Finish caching: ${this.meta.name}`);
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
   * TODO: this was formatted to match as closely to the v2 format as possible
   * however that compatibility causes extra complexity here. When migrating to /v3
   * api, I think this could be much simplified
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
    // TODO: Comment that out as cannot switch log level (to be reverted)
    // this.logger.debug(`Start merging data: ${this.meta.name}`);

    const positions: IWalletUserEntry[] = [];
    const features = new Set<Partial<FeatureEnum>>();

    resolvedProtocols.forEach((protocol) => {
      if (protocol.chain.id !== chain) return;
      protocol.features.forEach((feature) => features.add(feature));
      if (protocol.wallets.has(user)) {
        positions.push(...this.enforceTokenArrayOutput(protocol.wallets.get(user)));
      }
    });
    const total = this.getPositionsTotal(positions);
    const positionsByFeature = Object.fromEntries(groupBy(positions, (i) => i.feature).entries());
    features.forEach((feature) => {
      if (!positionsByFeature[feature]) {
        // feature groups will always be present
        positionsByFeature[feature] = [];
      }
    });

    // TODO: Comment that out as cannot switch log level (to be reverted)
    // this.logger.debug(`Finish merging data: ${this.meta.name}`);

    return {
      // group positions by feature  { staking: [....], lending: [...] }
      positions: positionsByFeature,
      features: Array.from(features),
      total,
      chain: getChainById(chain),
    };
  }

  /**
   * Converts all token types to be arrays if not already
   */
  protected enforceTokenArrayOutput(pools: IWalletUserEntry[]): IWalletUserEntry[] {
    // Enforce array output
    pools.forEach((pool) => {
      if ('supply' in pool) {
        pool.supplied = [pool.supply];
        delete pool.supply;
      }

      if ('reward' in pool) {
        pool.rewarded = [pool.reward];
        delete pool.reward;
      }

      if ('borrow' in pool) {
        pool.borrowed = [pool.borrow];
        delete pool.borrow;
      }
    });
    return pools;
  }
}
