import { Address } from '@app/common';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import {
  INamedFunctionPredicates,
  INamedFunctions,
  IWalletOpportunity,
  IWalletMinimal,
  TokenMap,
  IWalletUserEntry,
  IProtocolMeta,
} from '../interfaces';
import { AbiService } from './AbiModule/AbiService';
import { EVMCore } from './EVMCore';

export abstract class SingleContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TMeta extends IProtocolMeta = IProtocolMeta,
> extends EVMCore<TMinimalType, TOpportunityType, TUserEntryType> {
  protected abstract multicall: MulticallAggregator;
  protected abstract abiService: AbiService;

  // Implemented in user-land
  protected abstract functionPredicates: INamedFunctionPredicates;

  /**
   *
   */
  protected abstract fetchOpportunityData(context: { [key: string]: any }): Promise<TMinimalType[]>;
  protected abstract formatOpportunity(
    pool: TMinimalType,
    tokens: TokenMap,
  ): TOpportunityType | void;

  // TODO: Type. The output on this, is the 'data' input on formatUserData
  protected abstract fetchUserData(addresses: Address[], pools: TOpportunityType[]): Promise<any>;
  // TODO: type; data: any is the return value from getAsyncUserData
  protected abstract formatUserData(
    address: Address,
    pool: TOpportunityType,
    data: any,
  ): TUserEntryType;
  functions: INamedFunctions = {};
  meta: TMeta;

  /**
   * Initialize the protocol. In this case it fetches the ABI using the supplied address
   * and parses it for the requested functions
   */
  async initialize() {
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${this.meta.address}`,
      `SingleContractProtocol/${this.constructor.name}`,
    );

    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain,
      this.functionPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.functions).length}/${
        Object.keys(this.functionPredicates).length
      } functions`,
      `SingleContractProtocol/${this.constructor.name}`,
    );
  }

  /***********************
   * Pool Data
   ***********************/

  /**
   * Fetches all available pools for this protocol
   *
   * @returns available pools
   */
  async getCacheableOpportunityData(): Promise<TMinimalType[]> {
    const context = await this.callInputlessFunctions();
    return this.fetchOpportunityData(this.formatContext(context));
  }

  /**************
   * User Data
   */

  /**
   * Fetches all user positions in this protocol
   *
   * @param addresses user addresses
   * @returns user wallets related to this protocol
   */
  async getUsersData(addresses: Address[]): Promise<[Map<Address, TUserEntryType[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();

    const results = new Map<Address, TUserEntryType[]>(
      addresses.map((address) => [address, [] as TUserEntryType[]]),
    );

    try {
      const multicallResults = await this.fetchUserData(addresses, pools);

      addresses.forEach((address) => {
        pools.forEach((pool) => {
          const userPool = this.formatUserData(address, pool, multicallResults);
          if (userPool) {
            results.get(address).push(userPool);
          }
        });
      });
    } catch (err) {
      errors.push(err);
    }

    return [results, errors];
  }

  /**************
   * Utilities
   */

  /**
   * optional override to format context data if desired
   * @param context inputless function results merged with meta.context data
   * @returns context
   */
  protected formatContext(context: { [key: string]: any }) {
    return context;
  }

  protected getMainContract() {
    return new DynamicContract(this.meta.address);
  }

  /**
   * Automatically calls all available functions (found using the predicates)
   * that don't have any user inputs & merges with supplied (hardcoded) meta data
   * returns the values mapped to the generic function names
   *
   * @returns { [key: string]: any }
   */
  protected async callInputlessFunctions() {
    // Prepare all inputless contract calls for automated multicall
    const inputlessCalls = Object.entries(this.functions).filter(
      ([, abiItem]) => !abiItem.inputs?.length,
    );

    // Execute multicall
    const contract = this.getMainContract();
    const results = await this.multicall.callArray(
      inputlessCalls.map(([, abiItem]) => contract.createCall(abiItem)),
      this.meta.chain,
    );

    // Map all calls to original generic function names i.e. { rewardToken: '0xabcd1234' }
    return inputlessCalls.reduce((acc, [name], idx) => {
      acc[name] = results[idx];
      return acc;
    }, this.meta.context ?? ({} as { [ley: string]: any }));
  }
}
