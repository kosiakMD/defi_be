import { Cache } from 'cache-manager';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId, ChainIdEnum, Logger } from '@app/common';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, INamedFunctions } from '../../interfaces';
import { BlockScan } from './BlockScan.service';
import { BlockScout } from './BlockScout.service';

export class AbiService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected blockscout: BlockScout,
    protected blockscan: BlockScan,
    protected config: ConfigService,
    protected multicall: MulticallAggregator,
  ) {}

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[]> {
    const ONE_HOUR = 60 * 60;
    const ONE_DAY = ONE_HOUR * 24;
    return this.getOrSet(ONE_DAY, this.getCacheKey(address, chain), async () => {
      const abi = await this.loadAbi(address, chain);

      if (this.isEIP897Proxy(abi)) {
        return this.handleAsEIP897Proxy(address, chain, abi);
      } else if (this.isEIP1967Proxy(abi)) {
        return this.handleAsEIP1967Proxy(address, chain);
      }

      return abi;
    });
  }

  async parseFunctionsFromAddress(
    address: Address,
    chain: ChainId,
    predicates: INamedFunctionPredicates,
  ) {
    const abi = await this.fetchAbi(address, chain);
    return this.parseFunctionsFromAbi(abi, predicates, address, chain);
  }

  private async parseFunctionsFromAbi(
    abi: AbiItem[],
    predicates: INamedFunctionPredicates,
    address: Address,
    chain: ChainIdEnum,
  ) {
    const readonly = abi.filter((item) => ['view', 'pure'].includes(item.stateMutability || ''));

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
    // TODO: always fails
    this.logger.warn('Database Strategy is not implemented', 'AbiService');
    // 2. try database
    const fromDB = await this.fetchAbiFromDatabase(address, chain);
    if (fromDB) {
      this.logger.log(`${chain}/${address} ABI Retrieved from Database`, 'AbiService');
      return fromDB;
    }

    // 3. try blockscan
    const fromBlockScan = await this.blockscan.fetchAbi(address, chain);
    if (fromBlockScan) {
      this.logger.log(`${chain}/${address} ABI Retrieved from BlockScan`, 'AbiService');
      return fromBlockScan;
    }

    // TODO: always fails
    this.logger.warn('BlockScout Strategy is not implemented', 'AbiService');
    // 4. try blockscout
    const fromBlockScout = await this.blockscout.fetchAbi(address, chain);
    if (fromBlockScout) {
      this.logger.log(`${chain}/${address} ABI Retrieved from BlockScout`, 'AbiService');
      return fromBlockScout;
    }

    throw new Error(`Unable to find appropriate ABI ${chain}/${address}`);
  }

  // https://eips.ethereum.org/EIPS/eip-1967
  private isEIP1967Proxy(abi: AbiItem[]): boolean {
    return abi.some(
      (item) =>
        item.name === 'implementation' && item.outputs.some((output) => output.type === 'address'),
    );
  }
  private async handleAsEIP1967Proxy(address: Address, chain: ChainId) {
    const web = this.multicall.web3(chain);
    const target = web.utils.numberToHex(
      web.utils.hexToNumberString(
        await web.eth.getStorageAt(
          address,
          // TODO: I don't know if this is a constant or not. This is the value for Lido on moonriver
          // gotten from https://moonriver.moonscan.io/address/0xffc7780c34b450d917d557e728f033033cb4fa8c#code
          // bytes32 internal constant _IMPLEMENTATION_SLOT of ERC1967Upgrade.sol
          '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
        ),
      ),
    );
    return this.fetchAbi(target, chain);
  }
  // https://eips.ethereum.org/EIPS/eip-897
  private isEIP897Proxy(abi: AbiItem[]): boolean {
    return (
      abi.some((item) => item.name === 'proxyType') &&
      abi.some(
        (item) =>
          item.name === 'implementation' &&
          item.outputs.some((output) => output.type === 'address'),
      )
    );
  }
  private async handleAsEIP897Proxy(address: Address, chain: ChainId, abi: AbiItem[]) {
    const implementation: AbiItem = abi.find((item) => item.name === 'implementation');
    const contract = new DynamicContract(address);
    const [target] = await this.multicall.callArray([contract.createCall(implementation)], chain);
    return this.fetchAbi(target, chain);
  }

  private getCacheKey(address: Address, chain: ChainId) {
    return `${chain}/${address.toLowerCase()}`;
  }

  private async fetchAbiFromDatabase(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    JSON.stringify({ address, chain });
    // TODO:
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
