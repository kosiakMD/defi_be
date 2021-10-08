import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { In, Repository } from 'typeorm';
import Web3 from 'web3';

import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { roundToNearestHour } from '@app/common/utils/dates';

import { BLACKLISTED_TOKENS } from '../common/constatnt';

import { AssetsEntity } from '../assets/entity/assets.entity';
import { BlacklistService } from '../blacklist/blacklist.service';
import { Web3Provider } from '../chain/web3.provider';
import { PriceService } from '../price/price.service';
import { excludeSecondArray, getUniqList, getUniqueAndToLowerCaseArrayData } from '../utils/utils';
import {
  BalancesResponse,
  BlockTimestamp,
  ErrorMessage,
  TokenBalance,
} from './interfaces/balance.interfaces';
import { BalancesLoadingStrategy, getBalancesSafe } from './strategy';
import { CovalentBalancesStrategy } from './strategy/covalent/covalent.strategy';
import { NetworkBalancesStrategy } from './strategy/network/network.strategy';

type PartialBalancesResponse = {
  address: Address;
  errors: ErrorMessage[];
  balances: TokenBalance[];
};

@Injectable()
export class BalancesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    @InjectRepository(AssetsEntity)
    private readonly assentsRepository: Repository<AssetsEntity>,
    private readonly priceService: PriceService,
    private readonly blacklistService: BlacklistService,
    private readonly web3Provider: Web3Provider,
    private readonly networkBalancesStrategy: NetworkBalancesStrategy,
    private readonly covalentBalancesStrategy: CovalentBalancesStrategy,
  ) {}

  public async getBalance(
    addresses: Address[],
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const chainsToHandle = getUniqList(chains);
    const addressesToHandle = await this.excludeBlacklisted(
      getUniqueAndToLowerCaseArrayData(addresses),
    );

    if (!addressesToHandle.length || !chainsToHandle.length) {
      return {};
    }

    const balances = await this.getRawBalances(chainsToHandle, addressesToHandle, assets);
    return this.mapResults(balances);
  }
  public async getBalanceAtBlock(
    addresses: Address[],
    blocks: Map<ChainIdEnum, BlockTimestamp>,
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const chainsToHandle = getUniqList(chains);
    const addressesToHandle = await this.excludeBlacklisted(
      getUniqueAndToLowerCaseArrayData(addresses),
    );

    if (!addressesToHandle.length || !chainsToHandle.length) {
      return {};
    }

    const balances = await this.getRawBalances(chainsToHandle, addressesToHandle, assets, blocks);

    return this.mapResults(balances);
  }

  async get24HourReturns(addresses: string[], chains: ChainIdEnum[], assets?: Address[]) {
    // Get current & past balances & prices
    const [now, then] = await Promise.all([
      this.getBalance(addresses, chains, assets),
      this.getBalanceAtBlock(addresses, await this.getBlock24HoursAgo(chains), chains, assets),
    ]);

    return this.calculate24HourReturns({ now, then });
  }

  async getBlockFromDate(target: Date, web3: Web3): Promise<BlockTimestamp> {
    const latestBlock = await web3.eth.getBlock('latest');
    // skip the first 3/4 of blocks for performance,
    // we only need past 24 hours & old blocks can have wildly different block times than recent blocks
    const earlyBlock = await web3.eth.getBlock(Math.floor(latestBlock.number * 0.75));
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
    const guessedBlock = await web3.eth.getBlock(guess);
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

  calculate24HourReturns({ now, then }: { now: BalancesResponse; then: BalancesResponse }) {
    return Object.fromEntries(
      Object.entries(now).map(([account, balances]) => {
        let currentTotal = 0;
        let pastTotal = 0;
        const tokens = balances.tokens.map((nowToken) => {
          const thenToken = then[account].tokens.find(
            (token) => token.token.address.toLowerCase() === nowToken.token.address.toLowerCase(),
          );

          currentTotal += nowToken.totalPriceUSD ?? 0;
          if (!thenToken) {
            return {
              token: nowToken.token,
              change: null,
              changeUSD: null,
              percent: null,
            };
          }

          pastTotal += thenToken.totalPriceUSD ?? 0;
          const change = nowToken.decimalsAmount - thenToken.decimalsAmount;
          const changeUSD = nowToken.totalPriceUSD - thenToken.totalPriceUSD;
          const percent =
            (nowToken.totalPriceUSD - thenToken.totalPriceUSD) / nowToken.totalPriceUSD;

          return {
            token: nowToken.token,
            change,
            changeUSD,
            percent,
          };
        });

        return [
          account,
          {
            account,
            totalUSD: currentTotal - pastTotal,
            totalPercent: (currentTotal - pastTotal) / currentTotal,
            tokens,
          },
        ];
      }),
    );
  }

  async getBlock24HoursAgo(chains: ChainIdEnum[]): Promise<Map<ChainIdEnum, BlockTimestamp>> {
    const blockMap = new Map<ChainIdEnum, BlockTimestamp>();

    await Promise.all(
      chains.map(async (chain) => {
        try {
          const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
          const block: BlockTimestamp = await this.getBlockFromDate(
            roundToNearestHour(yesterday),
            this.web3Provider.getInstanceByChainId(chain),
          );
          blockMap.set(chain, block);
        } catch {
          this.logger.error(
            `Failed to find historic block for chain ${chain}. Is the RPC an archive node?`,
          );
        }
      }),
    );

    return blockMap;
  }

  private async excludeBlacklisted(addresses: Address[]): Promise<Address[]> {
    const blacklistedAddresses = await this.blacklistService.filterIsBlacklisted(addresses);
    return excludeSecondArray(addresses, blacklistedAddresses);
  }

  private async getRawBalances(
    chains: ChainIdEnum[],
    addresses: Address[],
    assets: Address[],
    blocks?: Map<ChainIdEnum, BlockTimestamp>,
  ) {
    const results = await Promise.all(
      chains.map((chainId) =>
        this.getBalancesPerChain(chainId, addresses, assets, blocks?.get(chainId)),
      ),
    );
    return results.flat();
  }

  private async getBalancesPerChain(
    chainId: ChainIdEnum,
    addresses: Address[],
    assets: Address[],
    block: BlockTimestamp = null,
  ) {
    const strategies = this.getBalancesStrategiesPerChain(chainId);
    const assetsToHandle = await this.getAssetsToHandle(chainId, assets);
    const assetAddresses = assetsToHandle.map(({ address }) => address);

    let results = await Promise.all(
      addresses.map((address) =>
        this.getBalancesForChainForAddress(chainId, address, assetAddresses, strategies, block),
      ),
    );

    results = this.addAssetsInformation(results, assetsToHandle);
    return this.applyPrices(chainId, results, block);
  }

  private addAssetsInformation(results: PartialBalancesResponse[], assetsToHandle: AssetsEntity[]) {
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
    chain: ChainIdEnum,
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

  private async getTokenPrices(tokens: Address[], chain: ChainIdEnum, block?: BlockTimestamp) {
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
    chainId: ChainIdEnum,
    address: string,
    assets: string[],
    strategies: BalancesLoadingStrategy[],
    block?: BlockTimestamp,
  ): Promise<PartialBalancesResponse> {
    const results = await Promise.all(
      strategies.map((strategy) =>
        getBalancesSafe(strategy, { chainId, address, tokens: assets, block }, this.logger),
      ),
    );

    return results.reduce<PartialBalancesResponse>(
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

  private getBalancesStrategiesPerChain(chain: ChainIdEnum): BalancesLoadingStrategy[] {
    switch (chain) {
      // TODO: Only avalanche should use covalent until price job is setup
      case ChainIdEnum.avax:
        return [this.covalentBalancesStrategy];
      default:
        return [this.networkBalancesStrategy];
    }
  }

  private async getAssetsToHandle(chain: ChainIdEnum, requested?: Address[]) {
    if (requested?.length) {
      return this.assentsRepository.find({ where: { address: In(requested) } });
    }

    const cacheKey = `TRACKED_ASSETS_${chain}`;
    let cachedAssets = await this.cache.get<AssetsEntity[]>(cacheKey);
    if (cachedAssets?.length) {
      return cachedAssets;
    }

    cachedAssets = await this.assentsRepository.find({ where: { chain, isTracked: true } });
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
