import BigNumber, { BigNumber as BN } from 'bignumber.js';
import { UniSwapV2PairContract } from './chain/uniswapv2-pair/uniswapv2-pair.contract';

import {
  AssetPairData,
  UniswapPairReserves,
  UniswapReservesData,
  UniSwapV2PairMulticall
} from './chain/uniswapv2-pair/uniswapv2-pair.multicall';

import { web3 } from './chain/web3';
import { chainId, currencyId, protocol, stableCoins, whiteListCoins, wrappedCoin } from './config';
import { AssetPairReserveValue, CurrentPrice } from './models';
import { AssetsApiDto, AssetsService, Pair } from './services/assets.service';
import { PriceDto, PriceService } from './services/price.service';
import { Decimals, decimalsReserve } from './utils';
import { LIQUIDITY_LIMIT, zeroAddress } from './utils/constants';
import { logger } from './utils/logger';

const uniswapMulticall = new UniSwapV2PairMulticall();

export async function process(): Promise<void> {
  try {
    logger.info(`Starting job. Chain id: ${chainId}. Currency Id: ${currencyId}`);

    const assets = await AssetsService.getAssetsAndPairsByChain(chainId);
    if (!assets.length) {
      logger.warn('No assets found');
      return;
    }

    logger.info(`Assets loaded. ${assets.length} assets found`);
    const baseAssets = [wrappedCoin, ...stableCoins, ...whiteListCoins];
    const baseAssetsMap = buildBaseAssetsMap(assets, baseAssets);
    const assetsMap = buildAssetsMap(assets);

    const assetsToUpdate = await getAssetsWithNewPairs(baseAssetsMap, assetsMap);
    if (assetsToUpdate.length) {
      logger.info(`Saving asset pairs. ${assetsToUpdate.length} assets pairs found`);
      await AssetsService.saveAssetsPairs(assetsToUpdate);
    }

    // TODO: What if we run job for the first time. There won't be prices for all of this.
    //  We should base all prices on stable coins only
    const { prices: baseAssetPrices } = await PriceService.getTokensPrices(chainId, currencyId, baseAssets);

    const uniquePairAddresses = getUniquePairAddresses(assets);
    const reserves = await uniswapMulticall.getPairsReserves(
      Array.from(uniquePairAddresses),
    );

    const assetsPrices = getTokensPricesFromReserves(
      assets,
      reserves,
      baseAssetPrices,
      baseAssetsMap,
    );

    await PriceService.saveAssetsPrices(assetsPrices);

    logger.info(`Done. ${assetsPrices.length} prices stored`);
  } catch (e) {
    logger.error('Processing prices failed', e);
    throw e;
  }
}

function buildBaseAssetsMap(assets: AssetsApiDto[], baseAssets: string[]) {
  const baseAssetsMap = new Map<string, AssetsApiDto>();
  assets.forEach((asset) => {
    const isBaseAsset = baseAssets.some((address) => address === asset.address);
    if (isBaseAsset) {
      baseAssetsMap.set(asset.address, asset);
    }
  });
  return baseAssetsMap;
}

function buildAssetsMap(assets: AssetsApiDto[]) {
  const assetsMap = new Map<string, AssetsApiDto>();
  assets.forEach((asset) => assetsMap.set(asset.address, asset));
  return assetsMap;
}

async function getAssetsWithNewPairs(
  baseAssetsMap: Map<string, AssetsApiDto>,
  assetsMap: Map<string, AssetsApiDto>,
): Promise<AssetsApiDto[]> {
  // TODO: What if there are some token pairs after we store it into database
  //  We should be refreshing pairs from time to time
  const assetsWithNoPairs = Array
    .from(assetsMap.values())
    .filter(({ pairs }) => !pairs);

  if (!assetsWithNoPairs) {
    return [];
  }

  const assetsWithNoPairsMap = new Map<string, AssetsApiDto>();
  assetsWithNoPairs.forEach(asset => assetsWithNoPairsMap.set(asset.address, asset));

  let assetsPairs = assetsWithNoPairs
    .map(asset => buildPossibleAssetPairs(asset, baseAssetsMap))
    .flat();

  assetsPairs = await uniswapMulticall.getAssetsPairs(assetsPairs);

  await updateAssetsWithPairData(
    assetsWithNoPairsMap,
    assetsPairs,
    baseAssetsMap,
  );

  assetsWithNoPairs.forEach((asset) => {
    asset.pairs = asset.pairs || [];
  })

  return assetsWithNoPairs;
}

function buildPossibleAssetPairs(
  asset: AssetsApiDto,
  stableCoinMap: Map<string, AssetsApiDto>,
) {
  const pairs: AssetPairData[] = [];
  protocol.forEach(({ name, address }) => {
    if (asset.address !== wrappedCoin && stableCoinMap.get(asset.address)) {
      const value: AssetPairData = {
        baseAsset: wrappedCoin,
        asset: asset.address,
        factoryAddress: address,
        protocolName: name,
      };
      pairs.push(value);
    }

    stableCoinMap.forEach((stableCoin) => {
      if (asset.address !== stableCoin.address) {
        const value: AssetPairData = {
          baseAsset: stableCoin.address,
          asset: asset.address,
          factoryAddress: address,
          protocolName: name,
        };
        pairs.push(value);
      }
    });
  });

  return pairs;
}

async function updateAssetsWithPairData(
  assetsMap: Map<string, AssetsApiDto>,
  assetPairs: AssetPairData[],
  baseAssetsMap: Map<string, AssetsApiDto>,
): Promise<void> {
  const chunkSize = 100;
  for (let i = 0; i < assetPairs.length; i += chunkSize) {
    const slicePairs = assetPairs.slice(i, i + chunkSize);
    await Promise.all(
      slicePairs.map(async (pair) => {
        const apiAsset = assetsMap.get(pair.asset);
        await updateAssetWithPairData(apiAsset, pair, baseAssetsMap);
      }),
    );
  }
}

async function updateAssetWithPairData(
  asset: AssetsApiDto,
  pairData: AssetPairData,
  stableCoinMap: Map<string, AssetsApiDto>,
): Promise<void> {
  try {
    if (pairData.pairAddress === zeroAddress) {
      return;
    }

    const stable = stableCoinMap.get(pairData.baseAsset);
    const pair: Pair = {
      address: pairData.pairAddress,
      type: pairData.protocolName,
      tokens: [
        { tokenAddress: pairData.baseAsset, decimals: stable.decimals },
        { tokenAddress: pairData.asset, decimals: asset.decimals },
      ],
    };

    const contract = new UniSwapV2PairContract(web3, pair.address);
    const token0Address: string = await contract.token0();
    pair.tokens[0].pairPosition = pairData.baseAsset === token0Address.toLowerCase() ? 0 : 1;
    pair.tokens[1].pairPosition = pairData.asset === token0Address.toLowerCase() ? 0 : 1;

    if (!asset.pairs) {
      asset.pairs = [pair];
    } else {
      asset.pairs.push(pair);
    }
  } catch (e) {
    logger.info(e.message);
    return;
  }
}

function getUniquePairAddresses(assets: AssetsApiDto[]): Set<string> {
  const addressSet = new Set<string>();

  assets.forEach((asset) => {
    asset.pairs?.forEach((pair) => addressSet.add(pair.address));
  });

  return addressSet;
}

function getTokensPricesFromReserves(
  assets: AssetsApiDto[],
  pairsReserves: UniswapReservesData,
  baseAssetsPrices: CurrentPrice,
  baseAssetsMap: Map<string, AssetsApiDto>,
): PriceDto[] {
  const wrappedAsset = assets.find(({ address }) => address === wrappedCoin);
  const wrappedCoinPrice = getWrappedTokenPrice(
    wrappedAsset,
    pairsReserves,
    baseAssetsPrices,
  );

  const stableTokensPrice = new Map<string, PriceDto>();
  baseAssetsMap.forEach((value) => {
    stableTokensPrice.set(
      value.address,
      getStableTokenPrice(
        value,
        pairsReserves,
        wrappedCoinPrice,
        baseAssetsPrices,
      ),
    );
  });

  const tokensPrices = assets
    .filter((asset) => asset?.pairs?.length)
    .map((asset) => {
      if (asset.address === wrappedAsset.address) {
        return wrappedCoinPrice;
      }
      const stablePrice = stableTokensPrice.get(asset.address);
      if (asset.address === stablePrice?.address) {
        return stablePrice;
      }
      return getTokenPrice(asset,
        pairsReserves,
        wrappedCoinPrice,
        baseAssetsPrices,
        stableTokensPrice,
      );
    });

  tokensPrices.push({
    address: zeroAddress,
    price: wrappedCoinPrice.price,
    chainId,
    currencyId,
  });
  return tokensPrices.filter((asset) => !!asset);
}

// TODO: Method should not get and modify
function getTokenReserveAndModifyFields(
  pair: Pair,
  assetPairsReserves: UniswapPairReserves,
  assetAddress: string,
  stableCoinsReserveMap: Map<string, AssetPairReserveValue>,
  priceResponse: CurrentPrice,
) {
  const decimals0 = getCorrectTokenDecimals(pair.tokens[0].decimals);
  const decimals1 = getCorrectTokenDecimals(pair.tokens[1].decimals);
  [pair.tokens[0].reserved, pair.tokens[1].reserved] =
    pair.tokens[0].pairPosition === 0
      ? [
        decimalsReserve(assetPairsReserves.reserve0, decimals0),
        decimalsReserve(assetPairsReserves.reserve1, decimals1),
      ]
      : [
        decimalsReserve(assetPairsReserves.reserve1, decimals0),
        decimalsReserve(assetPairsReserves.reserve0, decimals1),
      ];

  if (pair.tokens[0]?.tokenAddress === assetAddress) {
    const reserveTokenUsd = new BigNumber(pair.tokens[1].reserved)
      .times(priceResponse[pair.tokens[1].tokenAddress])
      .toNumber();
    if (reserveTokenUsd >= LIQUIDITY_LIMIT) {
      const value: AssetPairReserveValue = {
        baseAssetAddress: pair.tokens[1].tokenAddress,
        baseAssetReserve: pair.tokens[1].reserved,
        assetReserve: pair.tokens[0].reserved,
        reserveUsd: reserveTokenUsd * 2,
      };

      stableCoinsReserveMap.set(pair.tokens[1].tokenAddress, value);
      return value;
    }
  }

  // TODO: Remove this code duplication
  const reserveTokenUsd = new BigNumber(pair.tokens[0].reserved)
    .times(priceResponse[pair.tokens[0].tokenAddress])
    .toNumber();
  if (reserveTokenUsd >= LIQUIDITY_LIMIT) {
    const value: AssetPairReserveValue = {
      baseAssetAddress: pair.tokens[0]?.tokenAddress,
      baseAssetReserve: pair.tokens[0].reserved,
      assetReserve: pair.tokens[1].reserved,
      reserveUsd: reserveTokenUsd * 2,
    };

    // TODO: We should not return and modify at the same time
    stableCoinsReserveMap.set(pair.tokens[0]?.tokenAddress, value);
    return value;
  }
}

function getTokenPrice(
  asset: AssetsApiDto,
  tokenReserves: UniswapReservesData,
  wrappedCoinPrice: PriceDto,
  priceResponse: CurrentPrice,
  stableTokensPrice: Map<string, PriceDto>,
): PriceDto {
  if (asset) {
    const stableCoinsMap = new Map<string, AssetPairReserveValue>();
    const value = mapReservesResults(
      tokenReserves,
      asset,
      priceResponse,
      stableCoinsMap,
    );

    if (value.reserveUsd) {
      const stablePrice = stableTokensPrice.get(value.baseAssetAddress);
      const price = value.baseAssetAddress === wrappedCoinPrice.address
        ? new BN(value.baseAssetReserve)
          .times(wrappedCoinPrice.price) //
          .div(value.assetReserve)
          .toNumber()
        : new BN(value.baseAssetReserve) //
          .times(stablePrice.price)
          .div(value.assetReserve)
          .toNumber();

      return {
        address: asset.address,
        price: price,
        chainId,
        currencyId,
      };
    }
  }
}

function getWrappedTokenPrice(
  wrappedAsset: AssetsApiDto,
  tokenReserves: UniswapReservesData,
  baseAssetsPrices: CurrentPrice,
): PriceDto {
  if (!wrappedAsset) {
    return;
  }

  const stableCoinsValuesMap = new Map<string, AssetPairReserveValue>();
  let value = getAssetEmptyValue();
  wrappedAsset?.pairs.forEach((pair) => {
    const assetPairsReserves = tokenReserves[pair.address];
    const result = getTokenReserveAndModifyFields(
      pair,
      assetPairsReserves,
      wrappedAsset.address,
      stableCoinsValuesMap,
      baseAssetsPrices,
    );

    const whiteListAddress = whiteListCoins.find(
      (address) => address === result?.baseAssetAddress,
    );

    // TODO: Why do we do this one?
    value = (!result || value.reserveUsd > result?.reserveUsd || whiteListAddress)
      ? value
      : result;
  });

  return {
    address: wrappedAsset.address,
    // TODO: This is correct ony in case base asset is stable coin
    //  Fix it
    price: new BN(value.baseAssetReserve) //
      .div(value.assetReserve)
      .toNumber(),
    chainId: wrappedAsset.chainId,
    currencyId,
  };
}

function getStableTokenPrice(
  asset: AssetsApiDto,
  tokenReserves: UniswapReservesData,
  wrappedCoinPrice: PriceDto,
  priceResponse: CurrentPrice,
): PriceDto {
  if (asset && asset.address !== wrappedCoin) {
    const stableCoinsMap = new Map<string, AssetPairReserveValue>();
    const value = mapReservesResults(
      tokenReserves,
      asset,
      priceResponse,
      stableCoinsMap,
    );

    const wrappedAssetReserves = stableCoinsMap.get(wrappedCoin);
    if (!wrappedAssetReserves && value.reserveUsd) {
      return {
        address: asset.address,
        price: new BN(value.baseAssetReserve) //
          .div(value.assetReserve)
          .toNumber(),
        chainId,
        currencyId,
      };
    }
    const tokenPairPrice = new BN(wrappedAssetReserves.baseAssetReserve)
      .times(wrappedCoinPrice.price)
      .div(wrappedAssetReserves.assetReserve)
      .toNumber();

    return {
      address: asset.address,
      price: tokenPairPrice,
      chainId,
      currencyId,
    };
  }
}

function mapReservesResults(
  tokenReserves: UniswapReservesData,
  asset: AssetsApiDto,
  priceResponse: CurrentPrice,
  stableCoinsMap: Map<string, AssetPairReserveValue>,
): AssetPairReserveValue {
  let value = getAssetEmptyValue();
  asset?.pairs.forEach((pair) => {
    const reserve = tokenReserves[pair.address];
    const result = getTokenReserveAndModifyFields(
      pair,
      reserve,
      asset.address,
      stableCoinsMap,
      priceResponse,
    );

    // TODO: We should calculate weighted price here, not with larges reserve
    value = !result || value.reserveUsd > result?.reserveUsd ? value : result;
  });

  return value;
}

function getAssetEmptyValue(): AssetPairReserveValue {
  return {
    baseAssetAddress: null,
    baseAssetReserve: null,
    assetReserve: null,
    reserveUsd: 0,
  };
}

function getCorrectTokenDecimals(decimals: Decimals): Decimals {
  return decimals || (decimals ?? 18);
}