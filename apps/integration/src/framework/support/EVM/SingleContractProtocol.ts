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
} from '../interfaces';
import { AbiService } from './AbiModule/AbiService';
import { EVMCore } from './EVMCore';

interface IEVMMeta extends IProtocolMeta {
  name: string;
  address: Address;
  context?: any;
}

export abstract class SingleContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IEVMMeta = IEVMMeta,
> extends EVMCore<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract multicall: MulticallAggregator;
  protected abstract abiService: AbiService;

  // Implemented in user-land
  protected abstract functionPredicates: INamedFunctionPredicates;
  protected interactiveFunctionPredicates: INamedFunctionPredicates = {};

  /**
   *
   */
  protected abstract fetchOpportunityData(context: { [key: string]: any }): Promise<TMinimalType[]>;

  /**
   * Fetches user balances and injects into pools
   *
   * @param address User Address
   * @param pools All Available pools
   */
  protected abstract fetchUserData(
    address: Address,
    pools: TOpportunityType[],
  ): Promise<TUserEntryType[]>;

  functions: INamedFunctions = {};
  interactiveFunctions: INamedFunctions = {};

  /**
   * Initialize the protocol. In this case it fetches the ABI using the supplied address
   * and parses it for the requested functions
   */
  async initialize() {
    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain,
      this.functionPredicates,
    );

    if (this.interactiveFunctionPredicates) {
      this.interactiveFunctions = await this.abiService.parseFunctionsFromAddress(
        this.meta.address,
        this.meta.chain,
        this.interactiveFunctionPredicates,
        ['nonpayable'],
      );
    }
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
