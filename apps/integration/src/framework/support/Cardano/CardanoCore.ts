import { Address, Logger } from '@app/common';

import { RootProtocolCacheable } from '../RootProtocolCacheable';
import {
  IProtocolMeta,
  IUserDataProtocolResponse,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../interfaces';

export abstract class CardanoCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract logger: Logger;

  protected abstract fetchUserData(
    address: Address,
    pools: TOpportunityType[],
  ): Promise<TUserEntryType[]>;

  async getUsersData(addresses: Address[]): Promise<IUserDataProtocolResponse<TUserEntryType>> {
    const { data: pools, errors } = await this.getPoolData();
    const results = new Map<Address, TUserEntryType[]>(
      addresses.map((address) => [address, [] as TUserEntryType[]]),
    );
    await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const userPools = await this.fetchUserData(address, pools);
          const filteredUserPools = userPools.filter((data) => data);
          // An array of undefined values can be obtained
          if (filteredUserPools.length) {
            results.get(address).push(...filteredUserPools);
          }
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    return { data: results, errors };
  }
}
