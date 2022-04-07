import { Cache } from 'cache-manager';
import crypto from 'crypto';

import { Address, Logger } from '@app/common';

import { getChainById } from '../../common/utils/chain';

import { AccountService } from '../../modules/microservices/account.service';
import { PriceService } from '../../modules/microservices/price.service';
import {
  IFeatureMeta,
  IProtocolMeta,
  IRootProtocol,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
} from './interfaces';

/**
 * Common Protocol Base. This is to be used cross-chain
 * so don't implement EVM specific solutions here, better to do higher up
 */
export abstract class RootProtocol<
  TMinimal extends IWalletMinimal,
  TOpportunity extends IWalletOpportunity,
  TUserEntry extends IWalletUserEntry,
> implements IRootProtocol
{
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;

  abstract initialize(): Promise<void>;
  abstract getCacheableOpportunityData(): Promise<TMinimal[]>; // get all raw data that can be cached (pools with token address, but not token details/price)
  abstract getUsersData(addresses: Address[]): Promise<[Map<Address, TUserEntry[]>, Error[]]>; // fetch user balances for each pool, and filter to only owned pools
  protected abstract formatOpportunity(
    opportunity: TMinimal,
    tokens: Map<Address, any>,
  ): TOpportunity | void;

  async cachePoolData(): Promise<TMinimal[]> {
    let pools: TMinimal[] = [];
    try {
      pools = await this.getCacheableOpportunityData();
    } catch (err) {
      this.logger.error(err.message, err.stack, this.constructor.name);
    }

    await this.cache.set(
      `pool_list_${this.getProtocolId()}`,
      pools.map((pool) => pool.id),
      { ttl: 60 * 60 * 24 * 7 }, // One Week, TODO: Discuss
    );

    // gather cached data => [key, value, key, value, key, value]
    const cached = pools.reduce((cached, pool) => {
      cached.push(`${this.meta.chain}_${pool.id}`);
      cached.push(pool);
      return cached;
    }, []);

    await this.cache.store.mset(...cached, { ttl: 60 * 60 * 24 });

    return pools;
  }

  async getPoolData(): Promise<[TOpportunity[], Error[]]> {
    const list = await this.cache.get<string[]>(`pool_list_${this.getProtocolId()}`);

    if (!list) {
      // If protocol pool list is not available, then
      // refetch all the pools and cache for the next person
      // (Only would likely be used for new deploys, or failed background job)
      this.logger.warn(
        `Failed to get pools list from cache. Fetching On Demand`,
        this.getProtocolId(),
      );
      return this.hydrateOpportunityData(await this.cachePoolData());
    }

    const pools = await this.cache.store.mget(
      ...list.map((poolId) => `${this.meta.chain}_${poolId}`),
      {},
    );

    if (list.length !== pools.length) {
      // Should only occur if pools list is cached, however the pools themselves are not cached
      // this could be an error due to ttl configuration between the pools. Falls back
      // to just refetching all the pools for next time
      this.logger.warn(
        'Failed to get all available pools for protocol. Fetching On Demand',
        this.getProtocolId(),
      );

      return this.hydrateOpportunityData(await this.cachePoolData());
    }

    return this.hydrateOpportunityData(pools);
  }

  /**
   * Update real time info thats not available from the tokens themselves.
   * (such as APR returned from an external API)
   *
   * Override if required.
   *
   * @param opportunities
   * @returns
   */
  protected async updateRealTimeData(opportunities: TMinimal[]): Promise<TMinimal[]> {
    return opportunities;
  }

  protected async hydrateOpportunityData(
    opportunities: TMinimal[],
  ): Promise<[TOpportunity[], Error[]]> {
    const tokens = await this.getTokensForOpportunities(opportunities); // returns all required tokens for these pools
    const updatedOpportunities = await this.updateRealTimeData(opportunities); // update if needed
    return updatedOpportunities.reduce(
      ([finalOpportunityList, errors], opportunity) => {
        try {
          const pool = this.formatOpportunity(opportunity, tokens);
          if (pool) {
            finalOpportunityList.push(pool);
          } else {
            this.logger.warn(
              `Missing opportunity information: ${opportunity.id}`,
              this.constructor.name,
            );
          }
        } catch (err) {
          errors.push(err);
        }
        return [finalOpportunityList, errors];
      },
      [[], []],
    ); // hydrates each pool with full token details & live prices
  }

  // protected async getTokensForPools(pools: TMinimal[]): Promise<Map<Asset, FungibleToken>> {
  protected async getTokensForOpportunities(opportunities: TMinimal[]): Promise<Map<Address, any>> {
    // get all the token addresses from the pools
    const addresses = this.getUniqueTokensFromRawPools(opportunities);

    // get all the priced tokens (including underlying tokens)
    const tokens = await this.getOrSet(
      60,
      `cached_token_response_${this.meta.chain}_${this.getProtocolId()}`,
      () => this.getTokens(addresses),
    );

    // return tokens
    return new Map(tokens);
  }

  protected getUniqueTokensFromRawPools(pools: TMinimal[]) {
    const tokens = new Set<string>();
    pools.forEach((pool) => {
      if ('supplied' in pool && pool.supplied?.length) {
        pool.supplied.forEach((item) => tokens.add(item.token.address.toLowerCase()));
      }

      if ('borrowed' in pool && pool.borrowed?.length) {
        pool.borrowed.forEach((item) => tokens.add(item.token.address.toLowerCase()));
      }

      if ('rewarded' in pool && pool.rewarded?.length) {
        pool.rewarded.forEach((item) => tokens.add(item.token.address.toLowerCase()));
      }
    });

    return Array.from(tokens);
  }

  protected async getTokens(addresses: Address[]): Promise<[Address, any][]> {
    const { data: tokens } = await this.accountService.getAssets(addresses, [this.meta.chain]);
    const { prices } = await this.priceService.getTokenPricesFetch(addresses, this.meta.chain);

    return tokens.map((token: any) => [
      token.address,
      {
        // TODO: formatting fix (review what data do we want here, what do we have extra, what are we missing)
        // This will be easier/better when the new asset service is in place
        // TODO: merge better with an actual priced token type
        // - check how the new asset service will respond
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        chainId: token.chain,
        decimals: token.decimals,
        price: Number(prices[token.address]),
        underlying: token.underlyingAssets?.map((u) => {
          return {
            address: u.address,
            name: u.name,
            symbol: u.symbol,
            chainId: u.chainId,
            decimals: u.decimals,
            price: Number(prices[u.address]),
          };
        }),
      },
    ]);
  }

  meta: IProtocolMeta;
  getMeta(): IFeatureMeta {
    return {
      chain: getChainById(this.meta.chain),
      list: [this.meta.feature],
    };
  }
  public registerMeta(meta: IProtocolMeta) {
    this.meta = Object.assign(this.meta ?? {}, meta);
  }

  // generates a unique ID per protocol (useful for caching)
  getProtocolId() {
    const hash = crypto
      .createHash('sha256') //
      .update(JSON.stringify(this.meta))
      .digest('hex'); // digest('base64')

    return `${this.constructor.name}_${this.meta.chain}_${hash}`;
  }

  /**
   * retrieves from cache if available. If not available, executes the callback
   * & saves to cache for next time
   *
   * @param ttl time to live
   * @param key cache key
   * @param callback data to cache
   * @returns data
   */
  async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;

    // in the event of an error, nothing will be cached
    const data = await callback();
    if (data) {
      await this.cache.set(key, data, { ttl });
    }
    return data;
  }
}
