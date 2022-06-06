import { CurrentPricesPayload } from 'apps/integration/src/common/dto/price.response.dto';
import BigNumber from 'bignumber.js';

import { Address, Logger } from '@app/common';
import { chunk, keepAddressesByChainId, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { RootProtocolCacheable } from '../RootProtocolCacheable';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';
import { ERC20Token } from '../interfaces/tokens.common.interface';

export abstract class EVMCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
  TProtocolMeta extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimalType, TOpportunityType, TUserEntryType, TProtocolMeta> {
  // Common Services (Injected)
  protected abstract logger: Logger;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;

  // This is only required at this level currently for calculating prices on missed
  // uniswap LP token pairs. When the asset service returns reserves/prices
  // this won't be needed at this level. then we could add multicall free
  // protocols, using just thegraph or API's etc
  protected abstract multicall: MulticallAggregator;

  /**
   * Fetches all tokens and prices
   *
   * @param addresses token addresses
   * @returns priced tokens
   * @notice Update with new asset service
   */
  protected async getTokens(addresses: Address[]): Promise<[Address, ERC20Token][]> {
    // Split into chunks to avoid 431 header too large errors from asset service
    const promises = chunk(addresses, 250).map(
      async (addresses): Promise<[string, ERC20Token][]> => {
        const { data: tokens } = await this.accountService.getAssets(addresses, [this.meta.chain]);

        // Ensure to get underlying tokens prices too
        const temp = new Set(addresses);
        tokens.forEach((token: any) => {
          if (!token.underlyingAssets?.length) return;
          token.underlyingAssets.forEach((t) => temp.add(t.address));
        });

        const { prices } = await this.priceService.getTokenPricesFetch(
          Array.from(temp),
          this.meta.chain,
        );

        const tokenUpdated = await this.updateTokenData(tokens, prices);

        // need :any as Asset doesn't have underlying tokens
        // return entries, but not a map so we can cache (serialize/deserialize) easily
        return tokenUpdated.map((token: any): [Address, ERC20Token] => {
          return [
            token.address,
            {
              // TODO: formatting fix (review what data do we want here, what do we have extra, what are we missing)
              // This will be easier/better when the new asset service is in place
              // TODO: merge better with an actual priced token type
              // - check how the new asset service will respond
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              totalSupply: token.totalSupply,

              chainId: token.chain,
              price: token.price || Number(prices[token.address]),

              underlying: token.underlyingAssets?.map((u): ERC20Token => {
                return {
                  // ERC20
                  address: u.address,
                  name: u.name,
                  symbol: u.symbol,
                  totalSupply: u.totalSupply,
                  decimals: u.decimals,
                  // Extra Token Info
                  chainId: u.chainId,
                  price: Number(prices[u.address]),
                  position: u.positionInPool,
                  reserve: u.reserve,
                };
              }),
            },
          ];
        });
      },
    );

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Overridden because currently all EVM tokens need to be
   * lowercased in our system
   */
  protected getUniqueTokensFromRawPools(pools: TMinimalType[]) {
    const tokens = new Set<string>();
    const multi = ['supplied', 'borrowed', 'rewarded'];
    const single = ['supply', 'borrow', 'reward'];
    pools.forEach((pool) => {
      tokens.add(pool.id.toLowerCase()); // LP token, yearn/beefy vault, etc
      multi.forEach((featureName) => {
        // array tokens
        if (pool?.[featureName]?.length) {
          pool[featureName].forEach((item) => {
            tokens.add(item.token.address.toLowerCase());

            // TODO: This is only required if asset-service doesn't provide
            // proper underlying token support (i.e. balancer, solana, etc)
            if (item.token?.underlying) {
              item.token?.underlying.map((token) => tokens.add(token.address.toLowerCase()));
            }
          });
        }
      });

      // Single Tokens
      single.forEach((featureName) => {
        if (pool?.[featureName]) {
          tokens.add(pool[featureName].token.address.toLowerCase());

          // TODO: This is only required if asset-service doesn't provide
          // proper underlying token support (i.e. balancer, solana, etc)
          if (pool[featureName].token?.underlying) {
            pool[featureName].token?.underlying.map((token) =>
              tokens.add(token.address.toLowerCase()),
            );
          }
        }
      });
    });

    return keepAddressesByChainId(Array.from(tokens), this.meta.chain);
  }

  /**
   * TODO: This is a hack to get the price of missing tokens and calculate the price of LP tokens.
   * It makes the assumption that every token which has an underlying token is a Uniswap V2 token
   * which is likely the case with MasterChef (but not always, see beets.fi, a balancer fork)
   * however this class aims to be be somewhat protocol agnostic, so ideally these prices/calculations
   * come from the asset service so we aren't required to categorize tokens and adapt different pricing
   * strategies here. For a direct token price lookup via the API its best to have an averaged price
   * like we do, but taking into account these are specific LP's at specific DEXes, I think just using
   * the raw price is acceptable here if needed (a SpookySwap LP is only available at SpookySwap so no
   * advantage in averaging that price across dexes)
   */

  protected getLpTokenContract(token: string) {
    return new UniswapV2Pair(token);
  }

  async updateUniswapLikeTokensData(tokens: any[], prices: CurrentPricesPayload) {
    const calls = new Map();
    tokens.forEach((token: any) => {
      if (token.underlyingAssets?.length !== 2) return;
      // const contract = new UniswapV2Pair(token.address);
      const contract = this.getLpTokenContract(token.address);
      calls.set(`${token.address}.totalSupply()`, contract.totalSupply());
      calls.set(`${token.address}.getReserves()`, contract.getReserves());
      calls.set(`${token.address}.token0()`, contract.token0());
      calls.set(`${token.address}.token1()`, contract.token1());
      token.underlyingAssets.forEach((asset) => {
        const c = new ERC20(asset.address);
        calls.set(`${asset.address}.totalSupply()`, c.totalSupply());
      });
    });
    const results = await this.multicall.handleInBatches(calls, this.meta.chain);
    tokens.forEach((token: any) => {
      if (token.underlyingAssets?.length !== 2) return;
      const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
      const token0Address = results.get(`${token.address}.token0()`).output.data.toLowerCase();
      const token1Address = results.get(`${token.address}.token1()`).output.data.toLowerCase();
      const { _reserve0, _reserve1 } = results.get(`${token.address}.getReserves()`).output.data;
      if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

      const underlying0 = token.underlyingAssets.find((a) => a.address === token0Address);
      const underlying1 = token.underlyingAssets.find((a) => a.address === token1Address);

      const reserve0 = normalizeDecimals(_reserve0.toString(), underlying0.decimals);
      const reserve1 = normalizeDecimals(_reserve1.toString(), underlying1.decimals);

      // calculate/fill in missing base token prices based on current LP reserves
      if (!prices[token0Address]) {
        prices[token0Address] = (reserve1 * Number(prices[token1Address])) / reserve0;
      }

      if (!prices[token1Address]) {
        prices[token1Address] = (reserve0 * Number(prices[token0Address])) / reserve1;
      }

      // calculate/fill the LP token price into the price array
      const tvl0 = new BigNumber(reserve0 * Number(prices[token0Address]));
      const tvl1 = new BigNumber(reserve1 * Number(prices[token1Address]));

      token.totalSupply = normalizeDecimals(totalSupply, token.decimals);

      prices[token.address] = new BigNumber(tvl0.plus(tvl1)) //
        .div(token.totalSupply)
        .toNumber();

      token.underlyingAssets.forEach((u) => {
        u.totalSupply = normalizeDecimals(
          results.get(`${u.address}.totalSupply()`).output.data,
          u.decimals,
        );

        u.reserve = normalizeDecimals(
          (u.reserve = u.positionInPool === 0 ? _reserve0 : _reserve1).toString(),
          u.decimals,
        );
      });
    });
    return tokens;
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      return await this.updateUniswapLikeTokensData(tokens, prices);
    } catch (err) {
      // TODO: delete this block, Prices should come from asset service, not calculated here
      this.logger.error(err.message, err.stack, 'EVMCore');
      return tokens;
    }
  }
}
