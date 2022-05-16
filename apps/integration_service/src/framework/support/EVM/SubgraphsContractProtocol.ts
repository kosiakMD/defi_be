import { Address } from '@app/common';

import { RootProtocolCacheable } from '../RootProtocolCacheable';
import {
  IProtocolMeta,
  IUserDataProtocolResponse,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../interfaces';

export abstract class SubgraphsContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract fetchUserData(addresses: Address[], pools: TOpportunityType[]): Promise<any>;
  // TODO: type; data: any is the return value from getAsyncUserData
  protected abstract formatUserData(
    address: Address,
    pools: TOpportunityType[],
    data: any,
  ): TUserEntryType[];

  /**
   * Fetches all user positions in this protocol
   *
   * @param addresses user addresses
   * @returns user wallets related to this protocol
   */
  async getUsersData(addresses: Address[]): Promise<IUserDataProtocolResponse<TUserEntryType>> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, TUserEntryType[]>(
      addresses.map((address) => [address, [] as TUserEntryType[]]),
    );

    try {
      const usersData = await this.fetchUserData(addresses, pools);

      for (const address of addresses) {
        const data = this.formatUserData(address, pools, usersData);
        results.get(address).push(...data);
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: results, errors };
  }

  protected async updateTokenData(tokens: any) {
    return tokens;
  }
}
