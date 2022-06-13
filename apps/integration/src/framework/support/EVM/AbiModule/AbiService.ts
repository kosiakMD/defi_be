import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId, ChainIdEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, INamedFunctions } from '../../interfaces';
import { AbiSource } from './abi.source.interface';
import { AbiNotFoundException } from './exceptions/AbiNotFoundException';
import { RateLimitException } from './exceptions/RateLimitException';
import { BlockScan } from './strategies/BlockScan.service';
import { BlockScout } from './strategies/BlockScout.service';
import { LocalFile } from './strategies/LocalFile.service';
import { Tenderly } from './strategies/Tenderly.service';

export const logicContractAddress =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const beaconContractAddress =
  '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

export class AbiService {
  private readonly strategies: AbiSource[];
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    blockscout: BlockScout,
    blockscan: BlockScan,
    localfile: LocalFile,
    tenderly: Tenderly,
    private multicall: MulticallAggregator,
  ) {
    this.strategies = [
      // TODO: Database
      localfile,
      tenderly,
      blockscout,
      blockscan,
    ];
  }

  async fetchAbiUsingStrategy(address: Address, chain: ChainId, strategyName: string) {
    const strategy = this.strategies.find((strat) => strat.constructor.name === strategyName);
    const abi = await this.loadAbiFromStrategy(address, chain, strategy);
    if (abi) {
      return abi;
    }

    throw new AbiNotFoundException(chain, address);
  }

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[]> {
    const ONE_HOUR = 60 * 60;
    const ONE_DAY = ONE_HOUR * 24;
    return this.getOrSet(ONE_DAY, this.getCacheKey(address, chain), async () => {
      const abi = await this.loadAbi(address, chain);

      const proxyAddress = await this.checkForProxyAddress(address, chain, abi);
      if (proxyAddress) {
        return this.fetchProxyAbi(proxyAddress, chain);
      }

      return abi;
    });
  }

  private async checkForProxyAddress(
    address: Address,
    chain: ChainId,
    abi: AbiItem[],
  ): Promise<Address | null> {
    const possibleEIP897ProxyAddress = await this.attemptEIP897ProxyAddress(address, chain, abi);
    if (possibleEIP897ProxyAddress) return possibleEIP897ProxyAddress;

    const possibleEIP1967ProxyAddress = await this.attemptEIP1967ProxyAddress(address, chain);
    if (possibleEIP1967ProxyAddress) return possibleEIP1967ProxyAddress;

    const possibleCustomComptrollerAddress = await this.attemptCustomComptrollerProxyAddress(
      address,
      chain,
      abi,
    );
    if (possibleCustomComptrollerAddress) return possibleCustomComptrollerAddress;

    return null;
  }

  async parseFunctionsFromAddress(
    address: Address,
    chain: ChainId,
    predicates: INamedFunctionPredicates,
    acceptableStateMutability: string[] = ['view', 'pure'],
  ) {
    const abi = await this.fetchAbi(address, chain);
    return this.parseFunctionsFromAbi(abi, predicates, address, chain, acceptableStateMutability);
  }

  private async parseFunctionsFromAbi(
    abi: AbiItem[],
    predicates: INamedFunctionPredicates,
    address: Address,
    chain: ChainIdEnum,
    acceptableStateMutability: string[],
  ) {
    const readonly = abi.filter(
      (item) =>
        item.type === 'function' && acceptableStateMutability.includes(item.stateMutability || ''),
    );

    const params = { readonly, full: abi };

    return Object.entries(predicates).reduce((context, [name, predicate]) => {
      const found = readonly.find(predicate({ ...params, context }));
      if (!found) {
        throw new Error(`Failed to find ABI Item for '${name}' (${chain}/${address})`);
      }

      context[name] = found;
      return context;
    }, {} as INamedFunctions);
  }

  private async loadAbi(address: Address, chain: ChainId): Promise<AbiItem[]> {
    // loop synchronously from most to least preferred strategy
    for (const strategy of this.strategies) {
      try {
        const abi = await this.loadAbiFromStrategy(address, chain, strategy);
        if (abi) {
          return abi;
        }
      } catch (err) {
        if (err instanceof RateLimitException) {
          this.logger.warn(err.message, `AbiService/${strategy.constructor.name}`);
        } else {
          this.logger.error(err.message, err.stack, `AbiService/${strategy.constructor.name}`);
        }
      }
    }

    throw new AbiNotFoundException(chain, address);
  }

  private async loadAbiFromStrategy(address: Address, chain: ChainId, strategy?: AbiSource) {
    if (!strategy) return;

    const possibleAbi = await strategy.fetchAbi(address, chain);
    if (possibleAbi) {
      this.logger.log(
        `${chain}/${address} ABI Retrieved from ${strategy.constructor.name}`,
        'AbiService',
      );
      return possibleAbi;
    }
  }

  private async fetchProxyAbi(address: Address, chain: ChainId) {
    const abi = await this.fetchAbi(address, chain);
    // TODO: register scheduled service to refresh this abi in cache
    return abi;
  }

  private async attemptEIP1967ProxyAddress(address: Address, chain: ChainId) {
    try {
      const web = this.multicall.web3(chain);

      const rawTargets = await Promise.all([
        web.eth.getStorageAt(address, logicContractAddress),
        web.eth.getStorageAt(address, beaconContractAddress),
      ]);

      const targets = rawTargets.map(
        (rawTarget) => '0x' + web3.utils.padLeft(new BigNumber(rawTarget).toString(16), 40, '0'),
      );

      return targets.find((target) => this.isNonZeroAddress(target));
    } catch (e) {
      return null;
    }
  }

  private async attemptEIP897ProxyAddress(address: Address, chain: ChainId, abi: AbiItem[]) {
    try {
      const implementation: AbiItem = abi.find((item) => item.name === 'implementation');
      const contract = new DynamicContract(address);
      const target = await this.multicall.call(contract.createCall(implementation), chain);
      return this.isNonZeroAddress(target) ? target : null;
    } catch (e) {
      return null;
    }
  }

  async attemptCustomComptrollerProxyAddress(address: Address, chain: ChainId, abi: AbiItem[]) {
    try {
      const implementation: AbiItem = abi.find((item) => item.name === 'comptrollerImplementation');
      const contract = new DynamicContract(address);
      const target = await this.multicall.call(contract.createCall(implementation), chain);
      return this.isNonZeroAddress(target) ? target : null;
    } catch (e) {
      return null;
    }
  }

  isNonZeroAddress(address: string) {
    return address !== ZERO_ADDRESS && address !== '0x0';
  }

  private getCacheKey(address: Address, chain: ChainId) {
    return `${chain}/${address.toLowerCase()}`;
  }

  private async fetchAbiFromDatabase(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    JSON.stringify({ address, chain });
    this.logger.warn('Database Strategy is not implemented', 'AbiService');
  }

  async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) {
      this.logger.log(`${key} ABI Retrieved from Cache`, 'AbiService');
      return cached;
    }

    // in the event of an error, nothing will be cached
    const data = await callback();
    if (data) {
      await this.cache.set(key, data, { ttl });
    }
    return data;
  }
}
