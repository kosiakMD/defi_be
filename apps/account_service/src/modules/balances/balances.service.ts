import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { In, Raw, Repository } from 'typeorm';
import Web3 from 'web3';

import { CACHE_MANAGER, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { getUniqList } from '@app/common/utils';
import { unifyAddresses } from '@app/common/utils/addresses';
import { roundToNearestHour } from '@app/common/utils/dates';
import { retry } from '@app/common/utils/retry';

import { BLACKLISTED_TOKENS } from '../../common/constant';
import { BalancesLoadingStrategy } from '../../common/interfaces';
import { Web3Provider } from '../../common/providers/chainRelated/web3.provider';
import { PriceService } from '../../common/providers/microservices/price/price.service';
import { excludeSecondArray } from '../../common/utils';

import { AssetsEntity } from '../assets/entities/assets.entity';
import { BlacklistService } from '../blacklists/blacklist.service';
import { ChainsService } from '../chains/chains.service';
import { getBalancesSafe } from './balances.helpers';
import {
  BalancesResponse,
  BlockTimestamp,
  ErrorMessage,
  TokenBalance,
} from './balances.interfaces';
import { AccountReturns, ReturnsResponse, TokenChange } from './dto/balance.dto';
import { CardanoBalancesStrategy } from './strategies/cardano.balances.strategy';
import { CosmosBalancesStrategy } from './strategies/cosmos.balances.strategy';
import { CovalentBalancesStrategy } from './strategies/covalent.strategy';
import { KavaBalancesStrategy } from './strategies/kava.balances.strategy';
import { NetworkBalancesStrategy } from './strategies/network.strategy';
import { OsmosisBalancesStrategy } from './strategies/osmosis.balances.strategy';
import { RoninBalancesStrategy } from './strategies/ronin.balances.strategy';
import { SecretBalancesStrategy } from './strategies/secret.balances.strategy';
import { SolanaBalancesStrategy } from './strategies/solana.balances.strategy';
import { TerraBalancesStrategy } from './strategies/terra.balances.strategy';

type PartialBalancesResponse = {
  address: Address;
  errors: ErrorMessage[];
  balances: TokenBalance[];
};
export class BalancesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    @InjectRepository(AssetsEntity)
    private readonly assetsRepository: Repository<AssetsEntity>,
    private readonly priceService: PriceService,
    private readonly blacklistService: BlacklistService,
    private readonly web3Provider: Web3Provider,
    private readonly networkBalancesStrategy: NetworkBalancesStrategy,
    private readonly covalentBalancesStrategy: CovalentBalancesStrategy,
    private readonly solanaBalancesStrategy: SolanaBalancesStrategy,
    private readonly terraBalancesStrategy: TerraBalancesStrategy,
    private readonly cardanoBalancesStrategy: CardanoBalancesStrategy,
    private readonly cosmosBalancesStrategy: CosmosBalancesStrategy,
    private readonly kavaBalancesStrategy: KavaBalancesStrategy,
    private readonly osmosisBalancesStrategy: OsmosisBalancesStrategy,
    private readonly secretBalancesStrategy: SecretBalancesStrategy,
    private readonly roninBalancesStrategy: RoninBalancesStrategy,
    private readonly chainsService: ChainsService,
  ) {}

  strategies = [
    this.solanaBalancesStrategy,
    this.terraBalancesStrategy,
    this.cardanoBalancesStrategy,
    this.cosmosBalancesStrategy,
    this.kavaBalancesStrategy,
    this.osmosisBalancesStrategy,
    this.secretBalancesStrategy,
    this.roninBalancesStrategy,
  ];

  public async getBalance(
    addresses: Address[],
    chains?: number[],
    assets?: Address[],
    blocks?: Map<number, BlockTimestamp>,
  ): Promise<BalancesResponse> {
    try {
      const chainsToHandle = getUniqList(chains);
      const addressesToHandle = await this.excludeBlacklisted(
        unifyAddresses(getUniqList(addresses)),
      );

      if (!addressesToHandle.length || !chainsToHandle.length) {
        return {};
      }

      const balances = await this.getRawBalances(chainsToHandle, addressesToHandle, assets, blocks);

      const results = this.mapResults(balances);

      return results;
    } catch (e) {
      // TODO: This should be handled with global error handler
      this.logger.error(
        `Unhandled error while getting balances for ${JSON.stringify(
          addresses,
        )} networks ${JSON.stringify(chains)}`,
        e,
      );

      throw e;
    }
  }

  async get24HourReturns(
    addresses: Address[],
    chains: number[],
    assets?: Address[],
  ): Promise<ReturnsResponse> {
    const offset = 86400; // seconds ago from now 86400 = 1 day
    const date = this.getPastDate(offset);
    const blocks = await this.getChainBlocksAtDate(chains, date);

    // Get current & past balances & prices
    const [now, then] = await Promise.all([
      this.getBalance(addresses, chains, assets),
      this.getBalance(addresses, chains, assets, blocks),
    ]);

    return this.calculate24HourReturns(now, then);
  }

  async getBlockFromDate(target: Date, web3: Web3): Promise<BlockTimestamp> {
    const latestBlock = await retry(() => web3.eth.getBlock('latest'));
    // skip the first 3/4 of blocks for performance,
    // we only need past 24 hours & old blocks can have wildly different block times than recent blocks
    const earlyBlock = await retry(() => web3.eth.getBlock(Math.floor(latestBlock.number * 0.75)));
    const avgBlockTime =
      (Number(latestBlock.timestamp) - Number(earlyBlock.timestamp)) /
      (latestBlock.number - earlyBlock.number);

    const secondsInADay = 86400;
    const secondsIn15Minutes = 900;
    const guessedBlocksIn24Hours = Math.floor(secondsInADay / avgBlockTime);

    return this.estimateBlockTimes(
      latestBlock.number - guessedBlocksIn24Hours,
      target,
      avgBlockTime,
      secondsIn15Minutes,
      web3,
    );
  }

  async estimateBlockTimes(
    guess: number,
    target: Date,
    avgBlockTime: number,
    tolerance: number,
    web3: Web3,
  ): Promise<BlockTimestamp> {
    const guessedBlock = await retry(() => web3.eth.getBlock(guess));
    const guessedTime = new Date(Number(guessedBlock.timestamp) * 1000);
    const difference = Math.floor((guessedTime.getTime() - target.getTime()) / 1000); // difference in seconds
    if (Math.abs(difference) < tolerance) {
      return {
        date: guessedTime,
        block: guessedBlock.number,
        timestamp: (guessedTime.getTime() / 1000) >> 0,
      };
    }

    return this.estimateBlockTimes(
      guessedBlock.number - Math.floor(difference / avgBlockTime),
      target,
      avgBlockTime,
      tolerance,
      web3,
    );
  }

  private getTokenKey(token: TokenBalance): string {
    return `${token.token.chainId}_${token.token.address}`;
  }

  private calculate24HourReturns(now: BalancesResponse, then: BalancesResponse): ReturnsResponse {
    const responseEntries = Object.entries(now).map(
      ([account, balances]): [Address, AccountReturns] => {
        const accountReturnsEmpty = plainToClass(AccountReturns, {
          account,
          errors: [].concat(now[account].errors, then[account].errors),
          totalUSD: 0,
          chains: Array.from(new Set(now[account].tokens.map((t) => t.token.chainId))).map(
            (chainId) => ({ chainId, totalUSD: 0 }),
          ),
          tokens: [],
        });

        // Map historic tokens for easy access
        const thenTokenMap = new Map(
          then[account].tokens.map((token) => [this.getTokenKey(token), token]),
        );

        const accountReturns = balances.tokens.reduce((accountReturns, nowToken) => {
          const thenToken = thenTokenMap.get(this.getTokenKey(nowToken));

          if (!thenToken) return accountReturns; // no change, no historic data

          const tokenChange = plainToClass(TokenChange, {
            token: nowToken.token,
            balance: nowToken.decimalsAmount - thenToken.decimalsAmount, // number of tokens change
            price: nowToken.tokenPriceUSD - thenToken.tokenPriceUSD, // token price change
            totalUSD: nowToken.totalPriceUSD - thenToken.totalPriceUSD, // total change in USD for this token
          });

          // Filtering out any tokens that we don't track a monetary change for
          // often LP tokens and the like
          if (!tokenChange.totalUSD) {
            return accountReturns;
          }

          accountReturns.tokens.push(tokenChange);
          accountReturns.totalUSD += tokenChange.totalUSD;

          accountReturns.chains.forEach((chain) => {
            if (chain.chainId !== nowToken.token.chainId) return;
            chain.totalUSD += tokenChange.totalUSD;
          });

          return accountReturns;
        }, accountReturnsEmpty);

        return [account, accountReturns];
      },
    );

    return Object.fromEntries(responseEntries);
  }
  private async getChainBlocksAtDate(
    chains: number[],
    date: Date,
  ): Promise<Map<number, BlockTimestamp>> {
    const blockMap = new Map<number, BlockTimestamp>();

    await Promise.all(
      chains.map(async (chain) => {
        const block = await this.getBlockAtDate(chain, date);
        blockMap.set(chain, block);
      }),
    );

    return blockMap;
  }

  async getBlockAtDate(chain: number, date: Date) {
    const cacheTTL = 65 * 60; // 1 hour 5 minutes to ensure a little overlap (block is rounded to the nearest hour)
    const cacheKey = `24hour_ago_block_${chain}_${date.getTime()}`;

    return this.getOrSetCache(cacheKey, cacheTTL, async () => {
      try {
        return await this.getBlockFromDate(
          date,
          await this.web3Provider.getInstanceByChainId(chain),
        );
      } catch (e) {
        this.logger.error(
          `Failed to find historic block for chain ${chain}. Is the RPC an archive node?`,
        );
        this.logger.error(e);
      }
    });
  }

  private getPastDate(seconds) {
    const past = new Date(new Date().setSeconds(new Date().getSeconds() - seconds));
    return roundToNearestHour(past);
  }

  private async excludeBlacklisted(addresses: Address[]): Promise<Address[]> {
    const blacklistedAddresses = await this.blacklistService.filterIsBlacklisted(addresses);
    return excludeSecondArray(addresses, blacklistedAddresses);
  }

  async getOrSetCache<T>(cacheKey: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cacheValue = await this.cache.get<T>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const response = await callback();
    if (typeof response !== 'undefined') {
      await this.cache.set(cacheKey, response, { ttl });
    }

    return response;
  }

  private async getRawBalances(
    chains: number[],
    addresses: Address[],
    assets: Address[],
    blocks?: Map<number, BlockTimestamp>,
  ) {
    const results = await Promise.all(
      chains.map((chainId) =>
        this.getBalancesPerChain(chainId, addresses, assets, blocks?.get(chainId)),
      ),
    );
    return results.flat();
  }

  private async getBalancesPerChain(
    chainId: number,
    addresses: Address[],
    assets?: Address[],
    block: BlockTimestamp = null,
  ) {
    const strategies = await this.getBalancesStrategiesPerChain(chainId);
    const assetsToHandle = await this.getAssetsToHandle(chainId, assets, block);
    const assetAddresses = assetsToHandle.map(({ address }) => address);

    let results = await Promise.all(
      addresses.map((address) =>
        this.getBalancesForChainForAddress(chainId, address, assetAddresses, strategies, block),
      ),
    );

    results = BalancesService.addAssetsInformation(results, assetsToHandle);
    return this.applyPrices(chainId, results, block);
  }

  private static addAssetsInformation(
    results: PartialBalancesResponse[],
    assetsToHandle: AssetsEntity[],
  ) {
    const assetsMap = assetsToHandle.reduce((map, { address, name, symbol, decimals }) => {
      map[address] = {
        name,
        symbol,
        decimals,
      };
      return map;
    }, {});

    for (const { balances } of results) {
      for (const balance of balances) {
        const { token } = balance;
        const asset = assetsMap[token.address];
        if (asset) {
          token.symbol = asset.symbol;
          token.name = asset.name;
          token.decimals = asset.decimals;
          balance.decimalsAmount = new BigNumber(balance.amount)
            .div(new BigNumber(10).pow(asset.decimals))
            .toNumber();
        }
      }
    }
    return results;
  }

  private async applyPrices(
    chain: number,
    results: PartialBalancesResponse[],
    block?: BlockTimestamp,
  ): Promise<PartialBalancesResponse[]> {
    const tokensWithBalances = results
      .map(({ balances }) =>
        balances
          .filter(({ decimalsAmount, amount }) => decimalsAmount !== undefined && +amount > 0)
          .map(({ token }) => token.address),
      )
      .flat();

    const pricesMap = await this.getTokenPrices(tokensWithBalances, chain, block);
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

  private async getTokenPrices(tokens: Address[], chain: number, block?: BlockTimestamp) {
    // latest/pending/earliest/null
    if (!block?.block || Number.isNaN(Number(block?.block))) {
      const { prices: pricesMap } = await this.priceService.fetchTokenPrices(
        getUniqList(tokens),
        chain,
      );
      return pricesMap;
    }

    const { prices: pricesMap } = await this.priceService.getBulkPriceAtTimestamp(
      tokens,
      chain,
      block.timestamp,
    );

    return pricesMap;
  }

  private async getBalancesForChainForAddress(
    chainId: number,
    address: string,
    assets: string[],
    strategies: BalancesLoadingStrategy[],
    block?: BlockTimestamp,
  ): Promise<PartialBalancesResponse> {
    // If its a historic block we can cache for much longer,
    // as the target block only updates once an hour
    const cacheKey = block
      ? [chainId, address, assets, block.block].join('-')
      : [chainId, address, assets, 'latest'].join('-');
    const ttl = block ? 65 * 60 : 50;

    const cacheValue = await this.cache.get<PartialBalancesResponse>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const results = await Promise.all(
      strategies.map(async (strategy) => {
        return getBalancesSafe(strategy, { chainId, address, tokens: assets, block }, this.logger);
      }),
    );

    const final = results.reduce<PartialBalancesResponse>(
      (response, curr) =>
        curr.success
          ? { ...response, balances: this.mergeBalances(response.balances, curr.balances) }
          : {
              ...response,
              errors: response.errors.concat({
                chainId,
                message: curr.error.message,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              }),
            },
      {
        address,
        errors: [],
        balances: [],
      },
    );

    if (!final.errors.length) {
      await this.cache.set(cacheKey, final, { ttl });
    }

    return final;
  }

  private mergeBalances(base: TokenBalance[], more: TokenBalance[]): TokenBalance[] {
    for (const item of more) {
      const tokenAlreadyIncluded = base.some(
        ({ token: { address } }) => item.token.address === address,
      );
      if (!tokenAlreadyIncluded) {
        base.push(item);
      }
    }
    return base;
  }

  private async getBalancesStrategiesPerChain(chain: number): Promise<BalancesLoadingStrategy[]> {
    const chainEntity = await this.chainsService.get({ id: chain });
    const strategy = this.strategies.find((strategy) =>
      strategy.strategyName.toLowerCase().includes(chainEntity.name.toLowerCase()),
    );
    return [strategy ?? this.networkBalancesStrategy];
  }

  private async getAssetsToHandle(chain: number, requested?: Address[], block?: BlockTimestamp) {
    // If its a historic block, only return results that where inserted at least 24 hours ago
    // This fixes the issue with checking 24 hours returns and multicall failing when checking
    // tokens less than 24 hours old.
    const createdAtQuery = { createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL '24 HOURS'`) };

    if (requested?.length) {
      return this.assetsRepository.find({
        where: {
          chain,
          address: In(requested),
          ...(block && createdAtQuery),
        },
      });
    }

    const cacheKey = `TRACKED_ASSETS_${chain}-${block ? block.block : 'latest'}`;
    let cachedAssets = await this.cache.get<AssetsEntity[]>(cacheKey);
    if (cachedAssets?.length) {
      return cachedAssets;
    }

    cachedAssets = await this.assetsRepository.find({
      where: {
        chain,
        isTracked: true,
        ...(block && createdAtQuery),
      },
    });

    // NOTE: We store data in cache and forget about it
    this.cache.set<AssetsEntity[]>(cacheKey, cachedAssets, {
      ttl: this.configService.get<number>('CACHE_ASSETS_TTL'),
    });
    return cachedAssets;
  }

  private mapResults(results: PartialBalancesResponse[]): BalancesResponse {
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
