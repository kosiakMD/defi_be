import { BigNumber as BN } from 'bignumber.js';

import { UniSwapV2PairContract } from './chain/uniswapv2-pair/uniswapv2-pair.contract';
import {
  AssetPairArguments,
  AssetPairData,
  UniswapPairReserves,
  UniswapReservesData,
  UniSwapV2PairMulticall,
} from './chain/uniswapv2-pair/uniswapv2-pair.multicall';
import { web3 } from './chain/web3';
import {
  chainId,
  currencyId,
  liquidityLimit,
  poolUpdateHours,
  protocol,
  stableCoins,
  whiteListCoins,
  wrappedCoin,
} from './config';
import { AssetPairReserveValue } from './models';
import { AssetsApiDto, AssetsService, Pair, Token } from './services/assets.service';
import { PriceDto, PriceService } from './services/price.service';
import { Decimals, decimalsReserve } from './utils';
import { TokensCategories, zeroAddress } from './utils/constants';
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

    const uniquePairAddresses = getUniquePairAddresses(assets);
    const reserves = await uniswapMulticall.getPairsReserves(Array.from(uniquePairAddresses));

    const assetsPrices = getTokensPricesFromReserves(assets, reserves, baseAssetsMap);

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

/* function to check if the assetsPools data is actual for the current time and is it needs to do updated.
    We need to do this because new asset pools may appear over time and we need to track them
    to be able to calculate token prices
 */
function checkAssetPairsUpdateDate(asset: AssetsApiDto) {
  const randomHour = Math.floor(Math.random() * (poolUpdateHours / 2 - 1) + 1);
  const limitMs = (randomHour + poolUpdateHours) * 3600 * 1000;
  return Date.now() - Date.parse(asset.createdAt) < limitMs;
}

async function getAssetsWithNewPairs(
  baseAssetsMap: Map<string, AssetsApiDto>,
  assetsMap: Map<string, AssetsApiDto>,
): Promise<AssetsApiDto[]> {
  const assetsWithNoPairs = Array.from(assetsMap.values()).filter(
    (asset) => !asset?.pairs?.length || !checkAssetPairsUpdateDate(asset),
  );

  if (!assetsWithNoPairs) {
    return [];
  }

  const assetsWithNoPairsMap = new Map<string, AssetsApiDto>();
  assetsWithNoPairs.forEach((asset) => {
    asset.pairs = [];
    assetsWithNoPairsMap.set(asset.address, asset);
  });

  const assetsPairsArgs = assetsWithNoPairs
    .map((asset) => buildPossibleAssetPairs(asset, baseAssetsMap))
    .flat();

  const assetsPairs = await uniswapMulticall.getAssetsPairs(assetsPairsArgs);

  await updateAssetsWithPairData(assetsWithNoPairsMap, assetsPairs, baseAssetsMap);

  assetsWithNoPairs.forEach((asset) => {
    asset.pairs = asset.pairs || [];
  });

  return assetsWithNoPairs.filter(({ pairs }) => pairs && pairs.length);
}

function buildPossibleAssetPairs(asset: AssetsApiDto, stableCoinMap: Map<string, AssetsApiDto>) {
  const pairs: AssetPairArguments[] = [];
  protocol.forEach(({ name, address }) => {
    const stable = stableCoins.some((address) => address === asset.address);
    const whiteList = whiteListCoins.some((address) => address === asset.address);
    if (stable) {
      pairs.push(
        ...getPossibleAssetPairs([...whiteListCoins, wrappedCoin], name, address, asset.address),
      );
      return;
    }
    if (whiteList) {
      pairs.push(
        ...getPossibleAssetPairs([...stableCoins, wrappedCoin], name, address, asset.address),
      );
      return;
    }
    if (asset.address === wrappedCoin) {
      pairs.push(...getPossibleAssetPairs(stableCoins, name, address, asset.address));
      return;
    }
    pairs.push(
      ...getPossibleAssetPairs(Array.from(stableCoinMap.keys()), name, address, asset.address),
    );
  });

  return pairs;
}

function getPossibleAssetPairs(
  coins: string[],
  protocolName: string,
  factoryAddress: string,
  asset: string,
) {
  const pairs: AssetPairArguments[] = [];
  coins.forEach((coin) => {
    const value: AssetPairData = {
      baseAsset: coin,
      asset: asset,
      factoryAddress,
      protocolName,
    };
    pairs.push(value);
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
    logger.error(e.message);
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
  baseAssetsMap: Map<string, AssetsApiDto>,
): PriceDto[] {
  const wrappedAsset = assets.find(({ address }) => address === wrappedCoin);

  /*
  First we need to calculate the price of the wrappedToken, and then having its price find the
  prices for other tokens. TokensCategories define the strategy for finding tokens reserves values
  and tokens prices.
   */
  const wrappedCoinPrice = getTokenPrice(wrappedAsset, pairsReserves, TokensCategories.base);
  const baseTokensPrices = new Map<string, PriceDto>();
  baseTokensPrices.set(wrappedCoinPrice.address, wrappedCoinPrice);
  whiteListCoins.forEach((address) => {
    const asset = baseAssetsMap.get(address);
    baseTokensPrices.set(
      address,
      getTokenPrice(asset, pairsReserves, TokensCategories.base, baseTokensPrices),
    );
  });

  stableCoins.forEach((address) => {
    const asset = baseAssetsMap.get(address);
    baseTokensPrices.set(
      address,
      getTokenPrice(asset, pairsReserves, TokensCategories.stable, baseTokensPrices),
    );
  });

  const tokensPrices = assets
    .filter((asset) => asset?.pairs?.length)
    .map((asset) => {
      const basePrice = baseTokensPrices.get(asset.address);
      if (asset.address === basePrice?.address) {
        return basePrice;
      }
      return getTokenPrice(asset, pairsReserves, TokensCategories.simple, baseTokensPrices);
    });

  tokensPrices.push({
    address: zeroAddress,
    price: wrappedCoinPrice.price,
    chainId,
    currencyId,
  });
  return tokensPrices.filter((asset) => !!asset);
}

function getPairBaseTokensReservesValue(
  pair: Pair,
  assetPairsReserves: UniswapPairReserves,
  assetAddress: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  reserveFunction: Function,
  coinPriceMap?: Map<string, PriceDto>,
): AssetPairReserveValue {
  const reserves: string[] = Object.values(assetPairsReserves);
  const [token0, token1] = pair?.tokens;

  const args =
    token0?.tokenAddress === assetAddress
      ? [token1, token0, reserves, coinPriceMap]
      : [token0, token1, reserves, coinPriceMap];
  return reserveFunction.apply(this, args);
}

export function getBaseAssetPairReserveValue(
  baseAsset: Token,
  asset: Token,
  reserves: string[],
  baseTokesPriceMap: Map<string, PriceDto>,
) {
  const priceDto = baseTokesPriceMap?.get(baseAsset.tokenAddress);
  const reserveDecimals = getPairTokenReserve(baseAsset, reserves);
  const reserveTokenUsd = priceDto
    ? new BN(priceDto.price) //
        .times(reserveDecimals)
        .toNumber()
    : Number(reserveDecimals);
  if (reserveTokenUsd >= liquidityLimit) {
    return {
      baseAssetAddress: baseAsset?.tokenAddress,
      baseAssetReserve: reserveDecimals,
      assetReserve: getPairTokenReserve(asset, reserves),
      reserveUsd: reserveTokenUsd * 2,
    };
  }
}

export function getStableAssetPairReserveValue(baseAsset: Token, asset: Token, reserves: string[]) {
  const reserveStableToken = Number(getPairTokenReserve(asset, reserves));
  if (reserveStableToken >= liquidityLimit) {
    return {
      baseAssetAddress: baseAsset?.tokenAddress,
      baseAssetReserve: getPairTokenReserve(baseAsset, reserves),
      assetReserve: String(reserveStableToken),
      reserveUsd: reserveStableToken * 2,
    };
  }
}

export function getAssetPairReserveValue(
  baseAsset: Token,
  asset: Token,
  reserves: string[],
  baseTokesPriceMap: Map<string, PriceDto>,
) {
  const baseAssetReserve = getPairTokenReserve(baseAsset, reserves);
  const baseAssetPrice = baseTokesPriceMap.get(baseAsset.tokenAddress);
  if (!baseAssetPrice || !baseAssetPrice.price) {
    return;
  }

  const reserveTokenUsd = new BN(baseAssetReserve) //
    .times(baseAssetPrice.price)
    .toNumber();
  if (reserveTokenUsd >= liquidityLimit) {
    return {
      baseAssetAddress: baseAsset?.tokenAddress,
      baseAssetReserve: baseAssetReserve,
      assetReserve: getPairTokenReserve(asset, reserves),
      reserveUsd: reserveTokenUsd * 2,
    };
  }
}

function getPairTokenReserve(token: Token, reserves: string[]): string {
  const tokenDecimals = getCorrectTokenDecimals(token.decimals);
  return decimalsReserve(reserves[token.pairPosition], tokenDecimals);
}

function getTokenPrice(
  asset: AssetsApiDto,
  tokenReserves: UniswapReservesData,
  tokensCategory: TokensCategories,
  coinPriceMap?: Map<string, PriceDto>,
): PriceDto {
  if (!asset) {
    return;
  }
  const coinsReserveValues: AssetPairReserveValue[] = [];
  let totalLiquidityToken = 0;
  const [priceFunction, reserveFunction] =
    tokensCategory !== TokensCategories.base
      ? tokensCategory === TokensCategories.stable
        ? [getStablePrice, getStableAssetPairReserveValue]
        : [getPrice, getAssetPairReserveValue]
      : [getBasePrice, getBaseAssetPairReserveValue];

  asset?.pairs.forEach((pair) => {
    const pairReservesResult = getPairBaseTokensReservesValue(
      pair,
      tokenReserves[pair.address],
      asset.address,
      reserveFunction,
      coinPriceMap,
    );

    if (pairReservesResult) {
      totalLiquidityToken += Number(pairReservesResult.assetReserve);
      coinsReserveValues.push(pairReservesResult);
    }
  });

  if (!coinsReserveValues.length) {
    return;
  }

  let price = 0;
  coinsReserveValues?.forEach((value) => {
    const args = [value, totalLiquidityToken, coinPriceMap];
    price += priceFunction.apply(this, args);
  });

  return {
    address: asset.address,
    price: price,
    chainId: asset.chainId,
    currencyId,
  };
}

export function getStablePrice(
  value: AssetPairReserveValue,
  totalLiquidityToken: number,
  wrappedCoinPrice: Map<string, PriceDto>,
) {
  const tokenWeight = new BN(value.assetReserve) //
    .div(totalLiquidityToken)
    .toNumber();
  const baseTokenPrice = wrappedCoinPrice.get(value.baseAssetAddress);

  const tokenPairPrice = new BN(value.baseAssetReserve)
    .times(baseTokenPrice.price)
    .div(value.assetReserve);

  return (
    new BN(tokenWeight) //
      .times(tokenPairPrice)
      .toNumber() || 1
  );
}

export function getPrice(
  value: AssetPairReserveValue,
  totalLiquidityToken: number,
  stableTokensPrice: Map<string, PriceDto>,
) {
  const tokenWeight = new BN(value.assetReserve) //
    .div(totalLiquidityToken)
    .toNumber();
  const baseTokenPrice = stableTokensPrice.get(value.baseAssetAddress);

  const tokenPairPrice = new BN(value.baseAssetReserve)
    .times(baseTokenPrice.price)
    .div(value.assetReserve);

  return new BN(tokenWeight) //
    .times(tokenPairPrice)
    .toNumber();
}

export function getBasePrice(
  value: AssetPairReserveValue,
  totalLiquidityToken: number,
  coinPriceMap?: Map<string, PriceDto>,
) {
  const coinPrice = coinPriceMap?.get(wrappedCoin);
  const tokenWeight = new BN(value.assetReserve) //
    .div(totalLiquidityToken)
    .toNumber();
  const tokenPairPrice =
    value.baseAssetAddress === wrappedCoin
      ? new BN(value.baseAssetReserve) //
          .times(coinPrice.price)
          .div(value.assetReserve)
      : new BN(value.baseAssetReserve) //
          .div(value.assetReserve);

  return new BN(tokenWeight) //
    .times(tokenPairPrice)
    .toNumber();
}

function getCorrectTokenDecimals(decimals: Decimals): Decimals {
  return decimals || (decimals ?? 18);
}
