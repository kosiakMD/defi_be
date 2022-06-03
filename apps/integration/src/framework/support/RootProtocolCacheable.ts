import { Cache } from 'cache-manager';

import { Address, Logger } from '@app/common';
import { aprToApy, normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../modules/microservices/account.service';
import { PriceService } from '../../modules/microservices/price.service';
import { RootProtocol } from './RootProtocol';
import { MissingOpportunityException, MissingTokenException } from './exceptions';
import {
  IPoolDataProtocolResponse,
  IProtocolMeta,
  IWalletMinimal,
  IWalletOpportunity,
  IWalletUserEntry,
  TokenMap,
} from './interfaces';
import { IFeatureLinks } from './interfaces/feature.common.interface';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
} from './interfaces/tokens.borrowed.interface';
import { ERC20Token } from './interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from './interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from './interfaces/tokens.supplied.interface';

/**
 * Common Protocol Base. This is to be used cross-chain
 * so don't implement EVM specific solutions here, better to do higher up
 */
export abstract class RootProtocolCacheable<
  TMinimal extends IWalletMinimal,
  TOpportunity extends IWalletOpportunity,
  TUserEntry extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends RootProtocol<TProtocolMeta> {
  meta: TProtocolMeta;
  protected abstract logger: Logger;
  protected abstract cache: Cache;
  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;

  // 1. get cacheable data
  // 2. cache above data
  /** for pools */
  // 3. retrieve cached data and fill in 'real-time' data (prices, reserves) * most of this will come directly from asset service
  // 4. return formatted data
  /** For users */
  // 5. retrieve above pool data
  // 6. get user balances for each pool
  // 7. return format data

  /****************************************************
   * Cacheable data
   *
   * This is long term cacheable data that will not
   * change often. Pool list, token addresses
   *
   ****************************************************/

  /**
   * Returns the list of all available pools
   * This is long term cacheable data, so for example,
   * the token address, but not the token price
   */
  // TODO: Rename OpportunityList
  abstract getCacheableOpportunityData(): Promise<TMinimal[]>; // get all raw data that can be cached (pools with token address, but not token details/price)

  private get poolListCacheKey() {
    return `pool_list_${this.protocolId}`;
  }

  private singlePoolCacheKey(poolId: number | string) {
    return `${this.meta.chain}_${poolId}`;
  }

  /**
   * This will fetch all cacheable data for this
   * protocol & cache it along with a list of all
   * pools belonging to this protocol
   *
   * @returns MinimalOpportunities[]
   */
  async cachePoolData(): Promise<TMinimal[]> {
    const poolList: string[] = [];

    // Throw error if fails to cache this protocol
    const pools: TMinimal[] = await this.getCacheableOpportunityData();

    // gather cached data => [key, value, key, value, key, value]
    const cached = pools.reduce((cached, pool) => {
      // don't cache null pools
      if (pool?.id) {
        poolList.push(pool.id);
        cached.push(this.singlePoolCacheKey(pool.id), pool);
      } else {
        this.logger.warn(`Pool exists in list but cannot be cached ${JSON.stringify(pool)}`);
      }

      return cached;
    }, []);

    // Longest time a protocol will remain cached if
    // sync is never called
    const LONGEST_CACHE_TTL = 60 * 60 * 24;
    const options = { ttl: LONGEST_CACHE_TTL };

    try {
      // move pool list to the front of the array & cache everything
      cached.unshift(this.poolListCacheKey, poolList);
      await this.cache.store.mset(...cached, options);

      return pools;
    } catch (err) {
      this.logger.error(err.message, err.stack, this.constructor.name);
      throw err;
    }
  }

  /****************************************************
   * Pool Data
   *
   * This is the full pool list. Starts with the above cacheable data and fills
   * in any more real-time information, such as prices, reserves, totalSupplies, totalStaked
   * Much of this info will come from the new asset service when it goes live
   ****************************************************/

  /**
   * Update real time info thats not available from the tokens themselves.
   * (such as APR returned from an external API). This is likely to be realtime
   * data related to a specific opportunity such as APR, or live exchange rates
   * or other information thats required to process the full opportunity data
   * and user account information
   *
   * Override if required.
   *
   * @param opportunities
   * @returns
   */
  // TODO: rename fetchOpportunityData
  protected updateRealTimeData?(opportunities: TMinimal[]): Promise<TMinimal[]>;

  /**
   * Formats the output for listing all pools.
   * v3/protocols/:protocolName/opportunities
   * used by the opportunities service
   */
  async getFormattedPoolData(): Promise<IPoolDataProtocolResponse<TOpportunity>> {
    const { data: pools, errors } = await this.getPoolData();

    return { data: this.enforceTokenArrayOutput(pools), errors };
  }

  /**
   * Converts all token types to be arrays if not already
   */
  protected enforceTokenArrayOutput(pools: TOpportunity[]): TOpportunity[] {
    // Enforce array output
    pools.forEach((pool) => {
      if ('supply' in pool) {
        pool.supplied = [pool.supply];
        delete pool.supply;
      }

      if ('reward' in pool) {
        pool.rewarded = [pool.reward];
        delete pool.reward;
      }

      if ('borrow' in pool) {
        pool.borrowed = [pool.borrow];
        delete pool.borrow;
      }
    });
    return pools;
  }

  /**
   * This will fetch all available opportunities for this protocol.
   * It will attempt to return the list from the cache, however if that
   * is not available, it will fetch the data live & cache it for the
   * next request
   *
   * @returns [Opportunities[], errors[]]
   */
  async getPoolData(): Promise<IPoolDataProtocolResponse<TOpportunity>> {
    // TODO: Dont let me merge this!
    return this.getOrSet(60, `${this.protocolId}_hydrated_pool_list` + Math.random(), async () => {
      // get pool list from longer term cache
      const list = await this.cache.get<string[]>(this.poolListCacheKey);

      if (!list?.length) {
        // If protocol pool list is not available, then
        // refetch all the pools and cache for the next user
        // (Only would likely be used for new deploys, or failed background job)
        this.logger.warn(
          `Failed to get pools list from cache. Fetching On Demand`,
          this.protocolId,
        );
        return this.hydrateOpportunityData(await this.cachePoolData());
      }

      // fetch all cached pools from redis
      const pools = (
        await this.cache.store.mget(...list.map(this.singlePoolCacheKey.bind(this)), {})
      ).filter((pool) => pool);

      if (list.length !== pools.length) {
        // Should only occur if pools list is cached, however the pools themselves are not cached
        // this could be an error due to ttl configuration between the pools. Falls back
        // to just refetching all the pools for next time
        this.logger.warn('Pool list mismatch. Fetching On Demand', this.protocolId);

        return this.hydrateOpportunityData(await this.cachePoolData());
      }

      // Hydrate Cached Data
      return this.hydrateOpportunityData(pools);
    });
  }

  /**
   * This loops through the cached opportunity list
   * and fills in all real time data. prices, APR, etc. All
   * Information that can not be cached for extended periods
   * of time
   *
   * @param opportunities
   * @returns
   */
  protected async hydrateOpportunityData(
    opportunities: TMinimal[],
  ): Promise<IPoolDataProtocolResponse<TOpportunity>> {
    let tokens;
    try {
      tokens = await this.getTokensForOpportunities(opportunities);
    } catch (e) {
      if (e) {
        return { data: [], errors: [e] };
      }
    }
    let updatedOpportunities;
    let updatedOpportunitiesError;

    try {
      // fetch any extra required opportunity data not handled automatically
      updatedOpportunities = this.updateRealTimeData
        ? await this.updateRealTimeData(opportunities)
        : opportunities;
    } catch (e) {
      if (e) {
        updatedOpportunitiesError = e;
      }
    }

    return (updatedOpportunities ? updatedOpportunities : opportunities).reduce(
      ({ data: finalOpportunityList, errors }, opportunity) => {
        try {
          const pool = this.formatOpportunity(opportunity, tokens);
          if (!pool) {
            throw new MissingOpportunityException(opportunity, this.meta.chain);
          }

          finalOpportunityList.push(pool);
        } catch (err) {
          switch (true) {
            case err instanceof MissingOpportunityException: {
              this.logger.warn(err.message, this.constructor.name);
              // TODO: enable in dev
              // errors.push(err);
              break;
            }
            case err instanceof MissingTokenException: {
              this.logger.warn(err.message, this.constructor.name);
              // TODO: enable in dev
              // errors.push(err);
              break;
            }
            default: {
              this.logger.error(err.message, this.constructor.name);
              errors.push(err);
              break;
            }
          }
        }
        return { data: finalOpportunityList, errors };
      },
      { data: [], errors: updatedOpportunitiesError ? [updatedOpportunitiesError] : [] },
    ); // hydrates each pool with full token details & live prices
  }

  /**
   * Loops through all opportunities & fetches all required token details
   * This includes Price data, reserves, underlying tokens, etc
   *
   * @param opportunities minimal opportunity data
   * @returns all tokens
   */
  protected async getTokensForOpportunities(opportunities: TMinimal[]): Promise<Map<Address, any>> {
    // get all the token addresses from the pools
    const addresses = this.getUniqueTokensFromRawPools(opportunities);

    // get all the priced tokens (including underlying tokens)
    const tokens = await this.getTokens(addresses);

    // return tokens
    return new Map(tokens);
  }

  /**
   * Loops through all opportunities and collects
   * a full de-duplicated list of every required
   * token to be fetched from the asset service
   */
  protected getUniqueTokensFromRawPools(pools: TMinimal[]): Address[] {
    const tokens = new Set<string>();
    const multi = ['supplied', 'borrowed', 'rewarded'];
    const single = ['supply', 'borrow', 'reward'];
    pools.forEach((pool) => {
      tokens.add(pool.id); // LP token, yearn/beefy vault, etc

      multi.forEach((featureName) => {
        // array tokens
        if (pool?.[featureName]?.length) {
          pool[featureName].forEach((item) => {
            tokens.add(item.token.address);

            // TODO: This is only required if asset-service doesn't provide
            // proper underlying token support (i.e. balancer, solana, etc)
            if (item.token?.underlying) {
              item.token?.underlying.map((token) => tokens.add(token.address));
            }
          });
        }
      });

      // Single Tokens
      single.forEach((featureName) => {
        if (pool?.[featureName]) {
          tokens.add(pool[featureName].token.address);
        }
      });
    });

    return Array.from(tokens); // TODO: Filter out invalid addresses
  }

  /**
   * Fetches all tokens with prices & underlying tokens
   *
   * @param addresses token addresses
   */
  protected async getTokens(addresses: Address[]): Promise<[Address, any][]> {
    const { data: tokens } = await this.accountService.getAssets(addresses, [this.meta.chain]);
    const { prices } = await this.priceService.getTokenPricesFetch(addresses, this.meta.chain);

    return tokens.map((token: any) => [
      token.address,
      {
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

  /**
   * Converts a minimal entry into a full opportunity entry
   *
   * @param opportunity A specific opportunity
   * @param tokens map of all tokens (and token details) keyed by token address
   */
  protected formatOpportunity(opportunity: TMinimal, tokens: TokenMap): void | TOpportunity {
    const tvl = this.getOpportunityTVL(opportunity, tokens);

    // const base: Partial<TOpportunity> = { // TODO: 'token' isn't yet on TOpportunity
    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      meta: opportunity.meta,
    };
    if (opportunity.interactive) {
      base.interactive = opportunity.interactive;
    }

    const receipt = this.formatOpportunityReceiptToken(
      opportunity,
      tokens.get(opportunity.id),
      tokens,
    );
    if (receipt) {
      base.token = receipt;
    }

    // fill & format supplied tokens
    if ('supplied' in opportunity) {
      base.supplied = opportunity.supplied.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunitySuppliedToken(poolToken, token);
      });
    } else if ('supply' in opportunity) {
      const token = tokens.get(opportunity.supply.token.address);
      if (!token) {
        throw new MissingTokenException(opportunity.supply.token, opportunity, this.meta.chain);
      }

      base.supply = this.formatOpportunitySuppliedToken(opportunity.supply, token);
    }

    // fill & format reward tokens
    if ('rewarded' in opportunity) {
      base.rewarded = opportunity.rewarded.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunityRewardedToken(poolToken, token, tvl);
      });
    } else if ('reward' in opportunity) {
      const token = tokens.get(opportunity.reward.token.address);
      if (!token) {
        throw new MissingTokenException(opportunity.reward.token, opportunity, this.meta.chain);
      }

      base.reward = this.formatOpportunityRewardedToken(opportunity.reward, token, tvl);
    }

    // fill & format borrowed tokens
    if ('borrowed' in opportunity) {
      base.borrowed = opportunity.borrowed.map((poolToken) => {
        const token = tokens.get(poolToken.token.address);
        if (!token) {
          throw new MissingTokenException(poolToken.token, opportunity, this.meta.chain);
        }

        return this.formatOpportunityBorrowedToken(poolToken, token);
      });
    } else if ('borrow' in opportunity) {
      const token = tokens.get(opportunity.borrow.token.address);
      if (!token) {
        throw new MissingTokenException(opportunity.borrow.token, opportunity, this.meta.chain);
      }

      base.borrow = this.formatOpportunityBorrowedToken(opportunity.borrow, token);
    }

    return base;
  }

  protected getOpportunityTVL(opportunity: TMinimal, tokens: TokenMap): number {
    if ('supplied' in opportunity) {
      return opportunity.supplied.reduce((tvl, position) => {
        return (
          tvl + this.getTokenPositionTVL(tokens.get(position.token.address), position.totalSupplied)
        );
      }, 0);
    } else if ('supply' in opportunity) {
      return this.getTokenPositionTVL(
        tokens.get(opportunity.supply.token.address),
        opportunity.supply.totalSupplied,
      );
    }

    //TODO: throw error if no supplied tokens
    return 0;
  }

  private getTokenPositionTVL(token: ERC20Token, total: string | undefined) {
    if (!token?.price || !total) {
      return 0;
    }

    return token.price * normalizeDecimals(total, token.decimals);
  }

  /**
   * Generates Opportunity specific links
   *
   * @param opportunity
   */
  protected generateLinks(opportunity: TMinimal): IFeatureLinks {
    const links: IFeatureLinks = {};
    if ('links' in this.meta && this.meta.links?.getOpportunityLink) {
      links.opportunity = this.meta.links.getOpportunityLink(opportunity);
    }
    return links;
  }

  protected formatOpportunityReceiptToken(
    opportunity: TMinimal,
    token: ERC20Token,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokens: Map<Address, ERC20Token>,
  ) {
    if (!token) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { underlying, ...rest } = token;
    return rest;
  }

  protected formatSupplyApy?(supplied: ISupplyTokenMinimal<unknown>): any;
  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal<unknown>,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);
    const apy = this.formatSupplyApy?.(supplied);
    return {
      token,
      apy,
      tvl: totalSupplied * token.price,
    };
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal,
    token: ERC20Token,
    tvl: number, // for calculating apr
  ): IRewardTokenOpportunity {
    const tokensPerSecond = normalizeDecimals(poolToken.rewardPerSecond, token.decimals);
    const pricePerSecond = tokensPerSecond * token.price;

    const { apr: harvests } = this.getHarvestBreakdown(tokensPerSecond);
    const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);

    return {
      token,
      harvests,
      // Note: This only includes APR for _this token's rewards_ on the farm
      // so any trading fees are not included here
      apr,
      apy,
      rewardedForLendingSide: poolToken.rewardedForLendingSide,
      rewardedForTokenAddress: poolToken.rewardedForTokenAddress,
    };
  }

  protected formatBorrowApy?(borrowed: IBorrowTokenMinimal<unknown>): any;
  protected formatOpportunityBorrowedToken(
    borrowed: IBorrowTokenMinimal<unknown>,
    token: ERC20Token,
  ): IBorrowTokenOpportunity<unknown> {
    const totalBorrowed = normalizeDecimals(borrowed.totalBorrowed, token.decimals);
    const tvl = totalBorrowed * token.price;
    const apy = this.formatBorrowApy?.(borrowed);
    return {
      token,
      apy,
      tvl,
    };
  }

  /****************************************************
   * User Data
   *
   * This is the user positions. Starts with the full pool list above, and checks each
   * pool to get the users balance
   ****************************************************/
  /**
   * This will fetch all of the requested users positions.
   * Likely the developer will want to call getPools() to fetch
   * all available opportunities and cycle through them checking the user
   * balances & filtering down to only include the user positions
   *
   * @param addresses User Addresses
   */
  abstract getUsersData(
    addresses: Address[],
  ): Promise<{ data: Map<Address, TUserEntry[]>; errors: Error[] }>; // fetch user balances for each pool, and filter to only owned pools

  /****************************************************
   *
   * Utilities
   *
   ****************************************************/

  /**
   * retrieves from cache if available. If not available, executes the callback
   * & saves to cache for next time
   *
   * @param ttl time to live
   * @param key cache key
   * @param callback data to cache
   * @returns data
   */
  protected async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;

    // in the event of an error, nothing will be cached
    const data = await callback();
    if (data) {
      await this.cache.set(key, data, { ttl });
    }
    return data;
  }

  /**
   * get the number of tokens that can be expected
   * as rewards for the timeframes
   *
   * @param perSecond number of tokens per second
   * @returns
   */
  protected getHarvestBreakdown(perSecond: number) {
    return this.getYieldBreakdown(perSecond, 1);
  }

  /**
   * calculates estimated day/week/month/year breakdowns from
   * the supplied per-second value
   *
   * @param perSecond number of tokens, or value of rewards per second
   * @param ratio 1 tokens, or tvl for value of tokens
   * @returns
   */
  protected getYieldBreakdown(perSecond: number, ratio: number) {
    const perDay = perSecond * 60 * 60 * 24;
    const apr = {
      day: perDay / ratio || 0,
      week: (perDay * 7) / ratio || 0,
      month: (perDay * 365) / 12 / ratio || 0,
      year: (perDay * 365) / ratio || 0,
    };

    return {
      apr,
      apy: {
        // TODO: this does not take into account fees on each harvest
        day: aprToApy(apr.day, 1) || 0,
        week: aprToApy(apr.week, 7) || 0,
        month: aprToApy(apr.month, 365 / 12) || 0,
        year: aprToApy(apr.year, 365) || 0,
      },
    };
  }
}
