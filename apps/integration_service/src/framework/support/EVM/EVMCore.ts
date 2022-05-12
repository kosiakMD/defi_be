import { CurrentPricesPayload } from 'apps/integration_service/src/common/dto/price.response.dto';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { Address, Logger } from '@app/common';
import { chunk, normalizeDecimals } from '@app/common/utils';
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
  protected abstract cache: Cache;

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
        return tokenUpdated.map((token: any) => {
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
              chainId: token.chain,
              decimals: token.decimals,
              price: token.price || Number(prices[token.address]),
              totalSupply: token.totalSupply,
              underlying: token.underlyingAssets?.map((u) => {
                return {
                  address: u.address,
                  name: u.name,
                  symbol: u.symbol,
                  chainId: u.chainId,
                  decimals: u.decimals,
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
   * lowercased in out system
   */
  protected getUniqueTokensFromRawPools(pools: TMinimalType[]) {
    const tokens = new Set<string>();
    const features = ['supplied', 'borrowed', 'rewarded'];
    features.forEach((featureName) => {
      pools.forEach((pool) => {
        tokens.add(pool.id);

        if (pool?.[featureName]?.length) {
          pool[featureName].forEach((item) => tokens.add(item.token.address.toLowerCase()));
        }
      });
    });

    return Array.from(tokens);
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
  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      const calls = new Map();
      tokens.forEach((token: any) => {
        if (!token.underlyingAssets?.length) return;
        const contract = new UniswapV2Pair(token.address);
        calls.set(`${token.address}.totalSupply()`, contract.totalSupply());
        calls.set(`${token.address}.getReserves()`, contract.getReserves());
        calls.set(`${token.address}.token0()`, contract.token0());
        calls.set(`${token.address}.token1()`, contract.token1());
      });
      const results = await this.multicall.handleInBatches(calls, this.meta.chain);
      tokens.forEach((token: any) => {
        if (token.underlyingAssets?.length !== 2) return;
        const totalSupply = results.get(`${token.address}.totalSupply()`).output.data;
        const token0Address = results.get(`${token.address}.token0()`).output.data.toLowerCase();
        const token1Address = results.get(`${token.address}.token1()`).output.data.toLowerCase();
        const { _reserve0, _reserve1 } = results.get(`${token.address}.getReserves()`).output.data;
        if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

        // calculate/fill in missing base token prices based on current LP reserves
        if (!prices[token0Address]) {
          prices[token0Address] = _reserve1.times(prices[token1Address]).div(_reserve0);
        }
        if (!prices[token1Address]) {
          prices[token1Address] = _reserve1.times(prices[token0Address]).div(_reserve1);
        }

        // calculate/fill the LP token price into the price array
        const tvl0 = _reserve0.times(prices[token0Address]);
        const tvl1 = _reserve1.times(prices[token1Address]);
        prices[token.address] = new BigNumber(tvl0.plus(tvl1).toString()) //
          .div(totalSupply)
          .toNumber();
        token.underlyingAssets.forEach((u) => {
          u.reserve = normalizeDecimals(
            (u.reserve = u.positionInPool === 0 ? _reserve0 : _reserve1).toString(),
            u.decimals,
          );
        });
      });
      return tokens;
    } catch (err) {
      // TODO: delete this block, Prices should come from asset service, not calculated here
      this.logger.error(err.message, err.stack, 'EVMCore');
      return tokens;
    }
  }
}
