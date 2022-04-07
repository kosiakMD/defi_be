import { JSONPath } from 'jsonpath-plus';
import puppeteer from 'puppeteer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';

import { Address } from '@app/common';

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

export abstract class MultiContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TMeta extends IProtocolMeta = IProtocolMeta,
> extends EVMCore<TMinimalType, TOpportunityType, TUserEntryType> {
  protected abstract abiService: AbiService;
  protected abstract httpService: HttpService;
  // User Defined
  protected abstract functionPredicates: INamedFunctionPredicates;
  functions: INamedFunctions = {};
  meta: TMeta;

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

  async initialize() {
    const addresses = await this.fetchPoolList();

    const [address] = addresses;
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${address}`,
      `MultiContractProtocol/${this.constructor.name}`,
    );

    this.functions = await this.abiService.parseFunctionsFromAddress(
      address,
      this.meta.chain,
      this.functionPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${address} found ${Object.keys(this.functions).length}/${
        Object.keys(this.functionPredicates).length
      } functions`,
      `MultiContractProtocol/${this.constructor.name}`,
    );
  }
  async getCacheableOpportunityData(): Promise<TMinimalType[]> {
    return this.fetchOpportunityData(this.meta.context ?? {});
  }

  async getUsersData(addresses: string[]): Promise<[Map<string, TUserEntryType[]>, Error[]]> {
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

  /*******
   * Utilities
   */
  async fetchPoolList(): Promise<Address[]> {
    // Hard Coded Pools (Try To Avoid, left just in case)
    if (this.meta.poolList?.length) {
      return this.meta.poolList;
    }

    if (this.meta.api) {
      return this.fetchPoolListViaApi();
    }

    if (this.meta.scrape) {
      return this.fetchPoolListViaScraping();
    }

    throw new Error('No pool list options provided. Failed to retrieve pool list');
  }

  private async fetchPoolListViaApi() {
    const { endpoint, handler, path } = this.meta.api;

    const { data: json } = await firstValueFrom(this.httpService.get(endpoint));
    if (handler) {
      this.logger.debug('Formatting pools using handler', this.constructor.name);
      return handler(json);
    }

    if (path) {
      this.logger.debug('Formatting pools using jsonpath', this.constructor.name);
      return JSONPath({ path, json });
    }

    this.logger.warn(
      `Neither handler or path are provided for endpoint ${endpoint}. return results.`,
      this.constructor.name,
    );

    return json;
  }

  private async fetchPoolListViaScraping() {
    const { url, handler } = this.meta.scrape;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url);
    const handled = await page.evaluate(handler);
    await browser.close();
    return handled;
  }
}
