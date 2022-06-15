import { JSONPath } from 'jsonpath-plus';
import puppeteer from 'puppeteer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';

import { Address } from '@app/common';

import { FeatureEnum } from '../enums';
import {
  INamedFunctionPredicates,
  INamedFunctions,
  IProtocolMeta,
  IUserDataProtocolResponse,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../interfaces';
import { AbiService } from './AbiModule/AbiService';
import { EVMCore } from './EVMCore';

interface ICoreMultiContractProtocol extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context?: any;
  address?: string;
}

interface IHasApiHandler {
  scrape: never;
  poolList: never;
  api: {
    endpoint: string;
    handler: (data: unknown) => Address[];
    path: string;
  };
}

interface IHasWebScraper {
  api: never;
  poolList: never;
  scrape: {
    url: string;
    handler: (...args: any[]) => Address[];
  };
}

interface IHasPoolList {
  api: never;
  scrape: never;
  poolList: Address[];
}

type IMultiContractProtocolMeta = ICoreMultiContractProtocol &
  (IHasApiHandler | IHasWebScraper | IHasPoolList);

export abstract class MultiContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IMultiContractProtocolMeta = IMultiContractProtocolMeta,
> extends EVMCore<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract abiService: AbiService;
  protected abstract httpService: HttpService;
  // User Defined
  protected abstract functionPredicates: INamedFunctionPredicates;
  functions: INamedFunctions = {};

  protected abstract fetchOpportunityData(context: { [key: string]: any }): Promise<TMinimalType[]>;

  // TODO: Type. The output on this, is the 'data' input on formatUserData
  protected abstract fetchUsersData(addresses: Address[], pools: TOpportunityType[]): Promise<any>;

  // TODO: type; data: any is the return value from fetchUserData
  protected abstract formatUserData(
    address: Address,
    pool: TOpportunityType,
    data: any,
  ): TUserEntryType;

  async initialize() {
    const addresses = await this.fetchPoolList();

    // Max 3 attempts
    for (let i = -1; i < Math.min(addresses.length, 3); i++) {
      const addressToTry = addresses[i] ?? this.meta.address;

      this.logger.log(
        `Initializing: ${this.meta.name} ${this.meta.chain}/${addressToTry}`,
        `MultiContractProtocol/${this.constructor.name}`,
      );

      try {
        this.functions = await this.abiService.parseFunctionsFromAddress(
          addressToTry,
          this.meta.chain,
          this.functionPredicates,
        );

        return;
      } catch (err) {
        // failed to fetch abi. Moving along to the next address to try
      }
    }

    this.logger.error(
      `Failed to initialize protocol ${this.constructor.name}`,
      new Error('Failed to decode ABI').stack,
    );
  }

  async getCacheableOpportunityData(): Promise<TMinimalType[]> {
    return this.fetchOpportunityData(this.meta.context ?? {});
  }

  async getUsersData(addresses: string[]): Promise<IUserDataProtocolResponse<TUserEntryType>> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, TUserEntryType[]>(
      addresses.map((address) => [address, [] as TUserEntryType[]]),
    );

    try {
      const multicallResults = await this.fetchUsersData(addresses, pools);

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

    return { data: results, errors };
  }

  /*******
   * Utilities
   * TODO: this should be cached so subsequent visits don't re-fetch/screenscrape, etc
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
