import { AssetResponseObjectInterface } from '@sdk/assets/interfaces';
import { plainToClass } from 'class-transformer';

import { HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId, Logger } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';
import { getUniqList, normalizeDecimals } from '@app/common/utils';
import { unifyAddresses } from '@app/common/utils/addresses';
import { roundToNearestHour } from '@app/common/utils/dates';

import { BLACKLISTED_TOKENS } from '../../common/constant';
import { BalancesLoadingStrategy } from '../../common/interfaces';
import { AssetService } from '../../common/providers/microservices/assets/asset.service';
import { PriceService } from '../../common/providers/microservices/price/price.service';
import { BlocktimeService, BlockTimestamp } from '../../common/services/blocktime.service';
import { excludeSecondArray } from '../../common/utils';

import { BlacklistService } from '../blacklists/blacklist.service';
import { getBalancesSafe } from './balances.helpers';
import { BalancesResponse, ErrorMessage, TokenBalance } from './balances.interfaces';
import { AccountReturns, ReturnsResponse, TokenChange } from './dto/balance.dto';
import { getStrategyForNetwork } from './strategies/registry';

type PartialBalancesResponse = {
  address: Address;
  errors: ErrorMessage[];
  balances: TokenBalance[];
};

export class BalancesV2Service {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly assetService: AssetService,
    private readonly blacklistService: BlacklistService,
    private readonly blocktimeService: BlocktimeService,
  ) {}

  public async getBalance(
    addresses: Address[],
    chains: ChainId[],
    assets?: Address[],
    atTime?: Date,
  ): Promise<BalancesResponse> {
    try {
      const chainsToHandle = getUniqList(chains);
      const addressesToHandle = await this.excludeBlacklisted(
        unifyAddresses(getUniqList(addresses)),
      );

      if (!addressesToHandle.length || !chainsToHandle.length) {
        return {};
      }

      const balances = await this.getRawBalances(chainsToHandle, addressesToHandle, assets, atTime);
      return this.mergeBalances(balances);
    } catch (error) {
      this.logger.error({
        message: 'Unhandled error while getting balances',
        addresses,
        chains,
        error,
      });
      throw error;
    }
  }

  public async get24HourReturns(
    addresses: Address[],
    chains: ChainId[],
    assets?: Address[],
  ): Promise<ReturnsResponse> {
    try {
      const offset = 86400; // seconds ago from now 86400 = 1 day
      const date = this.getPastDate(offset);

      // Get current & past balances & prices
      const [now, then] = await Promise.all([
        this.getBalance(addresses, chains, assets),
        this.getBalance(addresses, chains, assets, date),
      ]);

      return this.calculate24HourReturns(now, then);
    } catch (error) {
      this.logger.error({
        message: 'Unhandled error while getting 24h returns',
        addresses,
        chains,
        error,
      });
      throw error;
    }
  }

  private calculate24HourReturns(now: BalancesResponse, then: BalancesResponse): ReturnsResponse {
    const accounts = Array.from(new Set([].concat(Object.keys(now), Object.keys(then))));

    const tokenKeys = Array.from(
      new Set(
        [].concat(
          Object.values(then).flatMap((a) => a.tokens.map((t) => this.getTokenKey(t))),
          Object.values(now).flatMap((a) => a.tokens.map((t) => this.getTokenKey(t))),
        ),
      ),
    );
    const responseEntries = accounts.map((account) => {
      const nowTokenMap = now[account].tokens.reduce(
        (map, token) => map.set(this.getTokenKey(token), token),
        new Map<string, TokenBalance>(),
      );
      const thenTokenMap = then[account].tokens.reduce(
        (map, token) => map.set(this.getTokenKey(token), token),
        new Map<string, TokenBalance>(),
      );
      const accountReturnsEmpty = plainToClass(AccountReturns, {
        account,
        errors: [].concat(now[account].errors, then[account].errors),
        totalUSD: 0,
        chains: Array.from(new Set(now[account].tokens.map((t) => t.token.chainId))).map(
          (chainId) => ({ chainId, totalUSD: 0 }),
        ),
        tokens: [],
      });

      const accountReturns = tokenKeys.reduce((acc, tokenKey) => {
        const nowToken = nowTokenMap.get(tokenKey);
        const thenToken = thenTokenMap.get(tokenKey);

        // this account does not and did not have this token
        if (!thenToken && !nowToken) {
          return acc;
        }

        // Calculate Token Change
        const tokenChange = this.getTokenChange(thenToken, nowToken);

        // Filtering out any tokens that we don't track a monetary change for
        // often LP tokens and the like
        if (!tokenChange.totalUSD) {
          return acc;
        }

        acc.tokens.push(tokenChange);
        acc.totalUSD += tokenChange.totalUSD;

        acc.chains.forEach((chain) => {
          if (chain.chainId !== tokenChange.token.chainId) {
            return;
          }

          chain.totalUSD += tokenChange.totalUSD;
        });

        return acc;
      }, accountReturnsEmpty);

      return [account, accountReturns];
    });

    return Object.fromEntries(responseEntries);
  }

  private getTokenKey(token: TokenBalance): string {
    return `${token.token.chainId}_${token.token.address}`;
  }

  private getTokenChange(
    thenToken: null | TokenBalance,
    nowToken: null | TokenBalance,
  ): TokenChange {
    // this account had the token, but does not now
    if (thenToken && !nowToken) {
      return plainToClass(TokenChange, {
        token: thenToken.token,
        balance: 0 - thenToken.decimalsAmount, // -100% tokens
        price: 0, // unknown price change
        totalUSD: 0 - thenToken.totalPriceUSD, // -100% USD
      });
    }

    // this account has the token, but did not before
    if (!thenToken && nowToken) {
      return plainToClass(TokenChange, {
        token: nowToken.token,
        balance: nowToken.decimalsAmount, // +100% tokens
        price: 0, // unknown price change
        totalUSD: nowToken.totalPriceUSD, // +100% USD
      });
    }

    if (thenToken && nowToken) {
      return plainToClass(TokenChange, {
        token: nowToken.token,
        balance: nowToken.decimalsAmount - thenToken.decimalsAmount, // number of tokens change
        price: nowToken.tokenPriceUSD - thenToken.tokenPriceUSD, // token price change
        totalUSD: nowToken.totalPriceUSD - thenToken.totalPriceUSD, // total change in USD for this token
      });
    }
  }

  private getPastDate(seconds: number) {
    const past = new Date(new Date().setSeconds(new Date().getSeconds() - seconds));
    return roundToNearestHour(past);
  }

  private async excludeBlacklisted(addresses: Address[]): Promise<Address[]> {
    const blacklistedAddresses = await this.blacklistService.filterIsBlacklisted(addresses);
    return excludeSecondArray(addresses, blacklistedAddresses);
  }

  private async getRawBalances(
    chains: ChainId[],
    addresses: Address[],
    assets?: Address[],
    atTime?: Date,
  ) {
    const results = await Promise.all(
      chains.map((chainId) => this.getBalancesPerChain(chainId, addresses, assets, atTime)),
    );
    return results.flat();
  }

  private async getBalancesPerChain(
    chainId: ChainId,
    addresses: Address[],
    assets?: Address[],
    atTime?: Date,
  ): Promise<PartialBalancesResponse[]> {
    const strategies = await this.moduleRef.resolve<BalancesLoadingStrategy>(
      getStrategyForNetwork(chainId),
    );
    const assetsToHandle = await this.getAssetsToHandle(chainId, assets);
    const assetAddresses = assetsToHandle.map(({ address }) => address);
    const block = atTime && (await this.blocktimeService.getBlockAtDate(chainId, atTime));

    let results = await Promise.all(
      addresses.map((address) =>
        this.getBalancesForChainForAddress(chainId, address, assetAddresses, strategies, block),
      ),
    );

    results = this.addAssetsInformation(results, assetsToHandle);

    if (block) {
      // TODO: Handle historical prices separately until assets service not finished
      return this.applyHistoricalPrices(chainId, results, block);
    }

    return results;
  }

  private addAssetsInformation(
    results: PartialBalancesResponse[],
    assetsToHandle: AssetResponseObjectInterface[],
  ): PartialBalancesResponse[] {
    const assetsMap = new Map(assetsToHandle.map((asset) => [asset.address, asset]));

    for (const { balances } of results) {
      for (const balance of balances) {
        const { token } = balance;
        const asset = assetsMap.get(token.address);
        if (asset) {
          token.symbol = asset.symbol;
          token.name = asset.name;
          token.decimals = asset.decimals;
          token.icon = asset.icon;
          balance.decimalsAmount = normalizeDecimals(balance.amount, asset.decimals);
          if (asset.price) {
            balance.tokenPriceUSD = asset.price;
            balance.totalPriceUSD = balance.decimalsAmount * balance.tokenPriceUSD;
          }
        }
      }
    }

    return results;
  }

  private async applyHistoricalPrices(
    chain: ChainId,
    results: PartialBalancesResponse[],
    block: BlockTimestamp,
  ): Promise<PartialBalancesResponse[]> {
    const tokensWithBalances = results
      .map(({ balances }) =>
        balances
          .filter(({ decimalsAmount, amount }) => decimalsAmount !== undefined && +amount > 0)
          .map(({ token }) => token.address),
      )
      .flat();

    const { prices: pricesMap } = await this.priceService.getBulkPriceAtTimestamp(
      tokensWithBalances,
      chain,
      block.timestamp,
    );

    for (const { balances } of results) {
      for (const balance of balances) {
        const price = pricesMap[balance.token.address] || 0;
        if (price) {
          balance.tokenPriceUSD = +price;
          balance.totalPriceUSD = balance.decimalsAmount * balance.tokenPriceUSD;
        }
      }
    }

    return results;
  }

  private async getBalancesForChainForAddress(
    chainId: number,
    address: string,
    assets: string[],
    strategy: BalancesLoadingStrategy,
    block?: BlockTimestamp,
  ): Promise<PartialBalancesResponse> {
    // If it's a historic block we can cache for much longer,
    // as the target block only updates once an hour
    const cacheKey = block
      ? [chainId, address, assets, block.block].join('-')
      : [chainId, address, assets, 'latest'].join('-');
    const ttl = block ? 65 * 60 : 50;

    const cacheValue = await this.cache.get<PartialBalancesResponse>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const results = await getBalancesSafe(
      strategy,
      { chainId, address, tokens: assets, block },
      this.logger,
    );

    const final: PartialBalancesResponse = {
      address,
      balances: results.balances,
      errors: results.error
        ? [
            {
              chainId,
              message: results.error.message,
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            },
          ]
        : [],
    };

    if (!final.errors.length) {
      await this.cache.set(cacheKey, final, { ttl });
    }

    return final;
  }

  private getAssetsToHandle(chain: ChainId, requested?: Address[]) {
    if (requested?.length) {
      // TODO: Get assets by addresses
      return [];
    }

    return this.cache.getOrLoad(
      `accounted_assets_${chain}`,
      () => this.assetService.getAccountedAssets(chain),
      {
        // TODO: Move to config
        ttl: 2 * 60,
      },
    );
  }

  private mergeBalances(results: PartialBalancesResponse[]): BalancesResponse {
    return results.reduce<BalancesResponse>((response, { balances, errors, address }) => {
      const accountBalance = response[address] || {
        account: address,
        tokens: [],
        totalUsd: 0,
        errors: [],
      };

      const partialUsd = balances.reduce((sum, { totalPriceUSD }) => sum + (totalPriceUSD || 0), 0);
      const totalUsd = accountBalance.totalUsd + partialUsd;

      return {
        ...response,
        [address]: {
          ...accountBalance,
          tokens: accountBalance.tokens.concat(
            balances.filter(({ token }) => !BLACKLISTED_TOKENS.includes(token.address)),
          ),
          errors: accountBalance.errors.concat(errors),
          totalUsd,
        },
      };
    }, {});
  }
}
