import { Address } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/erc20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import {
  IProtocolMeta,
  IUserDataProtocolResponse,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from '../interfaces';
import { RootProtocolCacheable } from '../root-protocol-cacheable';

export abstract class SubgraphsContractProtocol<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  protected abstract multicall: MulticallAggregator;

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

  protected async getTokens(addresses: string[]): Promise<[string, any][]> {
    const { data: tokens } = await this.accountService.getAssets(addresses, [this.meta.chain]);
    const { prices } = await this.priceService.getTokenPricesFetch(addresses, this.meta.chain);

    const calls = new Map();
    tokens.forEach((token: any) => {
      const contract = new ERC20(token.address);
      calls.set(token.address, contract.totalSupply());
    });
    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return tokens.map((token: any) => [
      token.address,
      {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        chainId: token.chain,
        decimals: token.decimals,
        totalSupply: results.has(token.address)
          ? normalizeDecimals(results.get(token.address).output.data, token.decimals)
          : null,
        price: Number(prices[token.address]),
        underlying: token.underlyingAssets?.map((u) => {
          return {
            address: u.address,
            name: u.name,
            symbol: u.symbol,
            totalSupply: results.has(u.address)
              ? normalizeDecimals(results.get(u.address).output.data, token.decimals)
              : null,
            chainId: u.chainId,
            decimals: u.decimals,
            price: Number(prices[u.address]),
          };
        }),
      },
    ]);
  }
}
