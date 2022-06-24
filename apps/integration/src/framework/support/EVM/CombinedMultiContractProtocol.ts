import { Address } from '@app/common';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import {
  INamedFunctionPredicates,
  INamedFunctions,
  IProtocolMeta,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
  TokenMap,
} from '../interfaces';
import { AbiService } from './AbiModule/AbiService';
import { EVMCore } from './EVMCore';

export interface CombinedMultiContractProtocolMeta extends IProtocolMeta {
  address: Address;
  poolsPredicate: string;
}

export abstract class CombinedMultiContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends CombinedMultiContractProtocolMeta = CombinedMultiContractProtocolMeta,
> extends EVMCore<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract abiService: AbiService;
  // User Defined
  protected abstract functionPredicates: INamedFunctionPredicates;
  protected abstract multicall: MulticallAggregator;

  functions: INamedFunctions = {};
  functionsPerPool: Map<string, INamedFunctions> = new Map<string, INamedFunctions>();

  mainProtocolData: any;

  protected abstract mainContractFunctionPredicates: INamedFunctionPredicates;
  mainContractFunctions: INamedFunctions = {};

  protected abstract fetchOpportunityData(context: { [key: string]: any }): Promise<TMinimalType[]>;

  protected abstract formatOpportunity(
    pool: TMinimalType,
    tokens: TokenMap,
  ): TOpportunityType | void;

  // TODO: Type. The output on this, is the 'data' input on formatUserData
  protected abstract fetchUsersData(addresses: Address[], pools: TOpportunityType[]);

  // TODO: type; data: any is the return value from fetchUserData
  protected abstract formatUserData(
    address: Address,
    pool: TOpportunityType,
    data: any,
  ): TUserEntryType;

  async initialize() {
    // TODO: cleanup side-effects
    await this.fetchPoolList();
  }

  async getCacheableOpportunityData(): Promise<TMinimalType[]> {
    const pools = await this.fetchPoolList();

    const calls = new Map();

    //make inputless calls for all of the pool contracts
    await Promise.all(
      pools.map(async (address) => {
        //todo implement a storage for abis or using tenderly
        const functionsPerPool = await this.abiService.parseFunctionsFromAddress(
          address,
          this.meta.chain,
          this.functionPredicates,
        );

        //todo implement hashing(? or something else) not to diplicate same abis
        this.functionsPerPool.set(address, functionsPerPool);

        const inputlessFunctionsPerPool = Object.values(functionsPerPool).filter(
          (item) => !item.inputs?.length,
        );

        const contract = new DynamicContract(address);

        inputlessFunctionsPerPool.forEach((item) => {
          calls.set(this.callLabel(item.name, address), contract.createCall(item));
        });
      }),
    );

    const result = await this.multicall.handleInBatches(calls, this.meta.chain);
    return this.fetchOpportunityData({ poolsData: result });
  }

  /*******
   * Utilities
   * The template requires the predicate to be assigned
   */
  async fetchPoolList(): Promise<Address[]> {
    if (this.meta.poolsPredicate) {
      await this.AssignInputlessFunctionsForMainProtocol();
      return this.getPoolsFromContractData();
    }

    throw new Error('No pool list options provided. Failed to retrieve pool list');
  }

  callLabel(genericName: string, address: Address, poolId = '') {
    return `${poolId}.${genericName}(${address})`;
  }

  private async AssignInputlessFunctionsForMainProtocol() {
    this.mainContractFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain,
      this.mainContractFunctionPredicates,
    );

    await this.callInputlessFunctionsForMainContract();
  }

  /**
   * Automatically calls all available functions of the main contract (found using the predicates)
   * that don't have any user inputs & merges with supplied (hardcoded) meta data
   * returns the values mapped to the generic function names
   *
   * @returns { [key: string]: any }
   */
  private async callInputlessFunctionsForMainContract() {
    const inputlessCalls = Object.entries(this.mainContractFunctions).filter(
      ([, abiItem]) => !abiItem.inputs?.length,
    );

    // Execute multicall
    const contract = this.getMainContract();
    const results = await this.multicall.callArray(
      inputlessCalls.map(([, abiItem]) => contract.createCall(abiItem)),
      this.meta.chain,
    );

    this.mainProtocolData = inputlessCalls.reduce((acc, [name], idx) => {
      acc[name] = results[idx];
      return acc;
    }, {} as { [key: string]: any });
  }

  protected getMainContract() {
    return new DynamicContract(this.meta.address);
  }

  //retrieve list of pools' addresses from input-less call result
  protected getPoolsFromContractData() {
    return this.mainProtocolData[this.meta.poolsPredicate];
  }
}
