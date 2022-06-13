import { AbiItem } from 'web3-utils';

import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId } from '@app/common';
import { COIN_ADDRESS } from '@app/common/constant';
import { chunkRunAsync, formatAddress, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UNIV2LP_ABI } from '../../../common/abis/univ2-lp.abi';
import { Univ2NetworkPriceProviderConfig } from '../../../common/types';
import { AssetBag } from '../../../common/types/asset-bag';
import { AssetPair } from '../../../common/types/asset-pair';

import { AssetsCachedRepository } from '../../assets/repositories/assets.cached-repository';
import { findAbiItem } from '../../assets/utils/abi';
import { areStringEqualsIgnoreCase } from '../../assets/utils/strings';
import { PriceService } from '../price.service';
import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type Config = Univ2NetworkPriceProviderConfig;

export class Univ2NetworkStrategy extends BaseStrategy<Config> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly assetsRepository: AssetsCachedRepository,
    private readonly priceService: PriceService,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  public async fetchPrices({ sourceId, config }: PriceSource<Config>): Promise<AssetPrice[]> {
    const { chainId, wrappedCoin, factory, minCap = 2000 } = config;

    const assetBag = new AssetBag();
    await this.loadBaseAssetsPricesIntoBag(assetBag, config);

    const baseAssets = this.getBaseAssetWithPrices(assetBag, config);
    if (!baseAssets.length) {
      return [];
    }

    const pairs = await this.assetsRepository.findUniV2LikePairsForTrackedAssets(
      chainId,
      formatAddress(factory),
      baseAssets,
    );
    if (!pairs.length) {
      return [];
    }

    this.logger.log(`${pairs.length} pairs found to load prices from`);

    const assets = await this.getAssetsInformation(chainId, baseAssets, pairs);
    assetBag.setAssets(assets);

    const getReservesAbi: AbiItem = findAbiItem(UNIV2LP_ABI, 'getReserves');
    const calls = pairs
      .map((pair) => {
        // NOTE: Make sure both assets are in asset bag
        if (assetBag.hasAsset(pair.token0) && assetBag.hasAsset(pair.token1)) {
          const contract = new DynamicContract(pair.address);
          return contract.createCall(getReservesAbi);
        }
      })
      .filter(Boolean);

    const responses = await chunkRunAsync(calls, 1000, (chunk) =>
      this.multicall.callArray(chunk, chainId),
    );

    const pairPrices = pairs
      .map((pair, index) => this.calculatePrice(assetBag, baseAssets, pair, responses[index]))
      .filter((price) => price?.cap >= minCap);

    const assetPrices = this.calculateWeightedPrices(pairPrices);

    const wrappedCoinPrice = assetPrices.find(
      ({ address, price }) => areStringEqualsIgnoreCase(address, wrappedCoin) && !!price,
    );
    if (wrappedCoinPrice) {
      assetPrices.push({ address: COIN_ADDRESS, price: wrappedCoinPrice.price });
    }

    return assetPrices.map((price) => ({ ...price, chainId, sourceId }));
  }

  private async loadBaseAssetsPricesIntoBag(bag: AssetBag, config: Config) {
    const { chainId, stableCoins } = config;
    const baseAssetsAddresses = this.getBaseAssetsAddresses(config);

    const prices = await this.priceService.getPrices(
      baseAssetsAddresses.map((address) => ({ address, chainId })),
    );

    prices.forEach(({ asset, price }) => {
      bag.setPrice(asset.address, price);
    });

    stableCoins.map(formatAddress).forEach((address) => {
      const price = bag.getPrice(address);
      if (!price) {
        // NOTE: We may assume stable coins price is $1.00
        bag.setPrice(address, 1);
      }
    });
  }

  private getBaseAssetWithPrices(assetBag: AssetBag, config: Config) {
    return this.getBaseAssetsAddresses(config).filter((address) =>
      // NOTE: If base asset price is not set, no reason to include token
      assetBag.hasPrice(address),
    );
  }

  private getAssetsInformation(chainId: ChainId, baseAssets: Address[], pairs: AssetPair[]) {
    const uniqueAssets: Address[] = [...baseAssets];
    pairs.forEach(({ token0, token1 }) => {
      if (!uniqueAssets.includes(token0)) {
        uniqueAssets.push(token0);
      }
      if (!uniqueAssets.includes(token1)) {
        uniqueAssets.push(token1);
      }
    });

    return this.assetsRepository.findManyByChainIdAndAddresses(chainId, uniqueAssets);
  }

  private calculatePrice(assetBag: AssetBag, baseAssets: Address[], pair: AssetPair, reserves) {
    const { token0, token1 } = pair;
    const { _reserve0, _reserve1 } = reserves;

    let targetAsset: Address;
    let targetAssetReserve: string;

    let baseAsset: Address;
    let baseAssetReserve: string;

    if (baseAssets.includes(token0)) {
      baseAsset = token0;
      baseAssetReserve = _reserve0;

      targetAsset = token1;
      targetAssetReserve = _reserve1;
    } else if (baseAssets.includes(token1)) {
      baseAsset = token1;
      baseAssetReserve = _reserve1;

      targetAsset = token0;
      targetAssetReserve = _reserve0;
    } else {
      throw new Error(
        `None asset in pair is in base assets, this is not possible. Pair ${JSON.stringify(pair)}`,
      );
    }

    const baseAssetPrice = assetBag.getPrice(baseAsset);
    const baseAssetDecimals = assetBag.getAsset(baseAsset).decimals;
    const baseAssetReserveNormalized = normalizeDecimals(baseAssetReserve, baseAssetDecimals);

    const targetAssetDecimals = assetBag.getAsset(targetAsset).decimals;
    const targetAssetReserveNormalized = normalizeDecimals(targetAssetReserve, targetAssetDecimals);

    const oneAssetCap = baseAssetPrice * baseAssetReserveNormalized;
    const targetAssetPrice = oneAssetCap / targetAssetReserveNormalized;

    return {
      cap: oneAssetCap * 2,
      asset: targetAsset,
      price: targetAssetPrice,
    };
  }

  private calculateWeightedPrices(pairPrices: { cap: number; price: number; asset: string }[]) {
    const assetStatsMap = pairPrices.reduce((map, { asset, price, cap }) => {
      if (!map[asset]) {
        map[asset] = { price, cap };
      } else {
        const { price: prevPrice, cap: prevCap } = map[asset];
        const totalCap = prevCap + cap;
        const newPrice = prevPrice * (prevCap / totalCap) + price * (cap / totalCap);
        map[asset] = {
          cap: totalCap,
          price: newPrice,
        };
      }
      return map;
    }, {} as Record<string, { price: number; cap: number }>);

    return Object.keys(assetStatsMap).map((address) => ({
      address,
      price: assetStatsMap[address].price,
    }));
  }

  private getBaseAssetsAddresses(config: Config) {
    const { wrappedCoin, stableCoins, proxyCoins } = config;
    return [...[wrappedCoin], ...stableCoins, ...(proxyCoins || [])].map(formatAddress);
  }
}
