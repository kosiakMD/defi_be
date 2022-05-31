import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';

import { Address, Logger } from '@app/common';

import { AccountService } from '../../../modules/microservice/account.service';
import { PriceService } from '../../../modules/microservice/price.service';
import {
  IProtocolMeta,
  IUserDataProtocolResponse,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../interfaces';
import { CosmosHubCore } from './cosmos-hub-core';

export abstract class SingleContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends CosmosHubCore<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  // Common Services (Injected)
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;
  protected abstract httpService: HttpService;

  protected abstract fetchUserData(addresses: Address[]): Promise<Map<Address, any[]>>;

  protected abstract formatUserData(
    address: string,
    pool: TOpportunityType[],
    data: Map<string, any[]>,
  ): TUserEntryType[];

  async getUsersData(addresses: string[]): Promise<IUserDataProtocolResponse<TUserEntryType>> {
    const { data: pools, errors } = await this.getPoolData();
    const results = new Map<string, TUserEntryType[]>(
      addresses.map((address) => [address, [] as TUserEntryType[]]),
    );
    try {
      const multicallResults = await this.fetchUserData(addresses);
      for (const address of addresses) {
        const data = this.formatUserData(address, pools, multicallResults);
        results.get(address).push(...data);
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: results, errors };
  }
}
