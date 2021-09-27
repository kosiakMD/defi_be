import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { In, Repository } from 'typeorm';

import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address } from '../common/interfaces';
import { BLACKLISTED_TOKENS } from 'src/common/constatnt';
import { ChainIdEnum } from 'src/common/enum';

import { Logger } from '../Logger/Logger.service';
import { AssetsEntity } from '../assets/entity/assets.entity';
import { BlacklistService } from '../blacklist/blacklist.service';
import { Web3Provider } from '../chain/web3.provider';
import { PriceService } from '../price/price.service';
import { excludeSecondArray, getUniqList, getUniqueAndToLowerCaseArrayData } from '../utils/utils';
import { BalancesResponse, ErrorMessage, TokenBalance } from './interfaces/balance.interfaces';
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

  private async excludeBlacklisted(addresses: Address[]): Promise<Address[]> {
    const blacklistedAddresses = await this.blacklistService.filterIsBlacklisted(addresses);
    return excludeSecondArray(addresses, blacklistedAddresses);
  }

  private async getRawBalances(chains: ChainIdEnum[], addresses: Address[], assets: Address[]) {
    const results = await Promise.all(
      chains.map((chainId) => this.getBalancesPerChain(chainId, addresses, assets)),
    );
    return results.flat();
  }

  private async getBalancesPerChain(chainId: ChainIdEnum, addresses: Address[], assets: Address[]) {
    const strategies = this.getBalancesStrategiesPerChain(chainId);
    const assetsToHandle = await this.getAssetsToHandle(chainId, assets);
    const assetAddresses = assetsToHandle.map(({ address }) => address);

    let results = await Promise.all(
      addresses.map((address) =>
        this.getBalancesForChainForAddress(chainId, address, assetAddresses, strategies),
      ),
    );

    results = this.addAssetsInformation(results, assetsToHandle);
    return this.applyPrices(chainId, results);
  }

  private addAssetsInformation(results: PartialBalancesResponse[], assetsToHandle: AssetsEntity[]) {
    const assetsMap = assetsToHandle.reduce(
      (map, asset) => ({
        ...map,
        [asset.address]: asset,
      }),
      {},
    );

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
  ): Promise<PartialBalancesResponse[]> {
    const tokensWithBalances = results
      .map(({ balances }) =>
        balances
          .filter(({ decimalsAmount, amount }) => decimalsAmount !== undefined && +amount > 0)
          .map(({ token }) => token.address),
      )
      .flat();

    const { prices: pricesMap } = await this.priceService.fetchTokenPrices(
      getUniqList(tokensWithBalances),
      chain,
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
    chainId: ChainIdEnum,
    address: string,
    assets: string[],
    strategies: BalancesLoadingStrategy[],
  ): Promise<PartialBalancesResponse> {
    const results = await Promise.all(
      strategies.map((strategy) =>
        getBalancesSafe(strategy, { chainId, address, tokens: assets }, this.logger),
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
      case ChainIdEnum.polygon:
        return [this.networkBalancesStrategy];
      default:
        return [this.covalentBalancesStrategy];
    }
  }

  private async getAssetsToHandle(chain: ChainIdEnum, requested?: Address[]) {
    if (requested?.length) {
      return this.assentsRepository.find({ where: { address: In(requested) } });
    }

    const cacheKey = `TRACKED_ASSETS_${chain}`;
    let cachedAssets = await this.cache.get<AssetsEntity[]>(cacheKey);
    if (cachedAssets) {
      return cachedAssets;
    }

    cachedAssets = await this.assentsRepository.find({ where: { chain, isTracked: true } });
    await this.cache.set<AssetsEntity[]>(cacheKey, cachedAssets);
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
          tokens: balances
            .filter(({ token }) => !BLACKLISTED_TOKENS.includes(token.address))
            .concat(balances),
          errors: accountBalance.errors.concat(errors),
          totalUsd,
        },
      };
    }, {});
  }
}
