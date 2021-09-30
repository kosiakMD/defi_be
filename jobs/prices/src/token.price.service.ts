import { BigNumber as BN } from 'bignumber.js';

import {
  UniswapPairReserves,
  UniswapReservesData,
  UniswapReservesResult,
} from './chain/multicall/types/token';
import {
  AssetsApiResponse,
  LambdaRequestInterface,
  Pair,
  PriceResponse,
  StableCoinMapValue,
} from './interfaces';
import { LOGGER } from './logger/logger';
import { Decimals, decimalsReserve } from './util';

export class TokenPriceService {
  public static getTokensPriceResponse(
    requestParams: LambdaRequestInterface,
    pairsReserves: UniswapReservesResult,
    assets: AssetsApiResponse[],
  ): PriceResponse[] {
    try {
      const wrappedCoin = assets.find((asset) => asset.address === requestParams.protocol.coin);
      const wrappedCoinPrice = TokenPriceService.getWrappedTokenPrice(
        wrappedCoin,
        pairsReserves.reserves,
        requestParams,
      );

      return assets
        .filter((asset) => asset?.pairs?.length)
        .map((asset) => {
          const argumentsArray = [asset, pairsReserves.reserves, requestParams, wrappedCoinPrice];
          if (asset.address === wrappedCoin.address) {
            return wrappedCoinPrice;
          }
          return requestParams.stableCoins.find((address) => address === asset.address)
            ? TokenPriceService.getStableTokenPrice.apply(this, argumentsArray)
            : TokenPriceService.getTokenPrice.apply(this, argumentsArray);
        });
    } catch (e) {
      LOGGER.error(e.message);
      throw e;
    }
  }

  public static getTokenReserveAndModifyFields(
    pair: Pair,
    assetPairsReserves: UniswapPairReserves,
    assetAddress: string,
    stableCoinsReserveMap: Map<string, StableCoinMapValue>,
  ): number {
    const decimals0 = TokenPriceService.getCorrectTokenDecimals(pair.tokens[0].decimals);
    const decimals1 = TokenPriceService.getCorrectTokenDecimals(pair.tokens[1].decimals);
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
      stableCoinsReserveMap.set(pair.tokens[1].tokenAddress, {
        reserveStable: pair.tokens[1].reserved,
        reserveCoin: pair.tokens[0].reserved,
      });
      return Number(pair.tokens[0].reserved);
    }
    stableCoinsReserveMap.set(pair.tokens[0]?.tokenAddress, {
      reserveStable: pair.tokens[0].reserved,
      reserveCoin: pair.tokens[1].reserved,
    });
    return Number(pair.tokens[1].reserved);
  }

  public static getTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
    wrappedCoinPrice: PriceResponse,
  ): PriceResponse {
    if (!asset) {
      return;
    }

    let totalLiquidityToken = 0;
    const stableCoinsMap = new Map<string, { reserveStable: string; reserveCoin: string }>();
    asset?.pairs.forEach((pair) => {
      const reserve = tokenReserves[pair.address];
      totalLiquidityToken += TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        reserve,
        asset.address,
        stableCoinsMap,
      );
    });

    let price = 0;
    requestParams.stableCoins.forEach((coin) => {
      const pairsReserves = stableCoinsMap.get(coin);
      if (!pairsReserves) {
        return;
      }
      const tokenWeight = new BN(pairsReserves.reserveCoin) //
        .div(totalLiquidityToken)
        .toNumber();
      const tokenPairPrice =
        coin === wrappedCoinPrice.address
          ? new BN(pairsReserves.reserveStable)
              .times(wrappedCoinPrice.price)
              .div(pairsReserves.reserveCoin)
              .toNumber()
          : new BN(pairsReserves.reserveStable) //
              .div(pairsReserves.reserveCoin)
              .toNumber();
      price +=
        new BN(tokenWeight) //
          .times(tokenPairPrice)
          .toNumber() || 0;
    });

    return {
      address: asset.address,
      price: price,
      chainId: requestParams.chainId,
      currencyId: requestParams.currencyId,
    };
  }

  public static getWrappedTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
  ): PriceResponse {
    if (!asset) {
      return;
    }
    const stableCoinsValuesMap = new Map<string, StableCoinMapValue>();
    let totalLiquidityToken = 0;
    asset?.pairs.forEach((pair) => {
      const assetPairsReserves = tokenReserves[pair.address];
      totalLiquidityToken += TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        assetPairsReserves,
        asset.address,
        stableCoinsValuesMap,
      );
    });

    let price = 0;
    requestParams.stableCoins.forEach((coin) => {
      if (coin === asset.address) {
        return;
      }
      const pairsReserves = stableCoinsValuesMap.get(coin);
      if (!pairsReserves) {
        LOGGER.info(`COIN --> ${coin}, asset -> ${JSON.stringify(asset)}`);
        return;
      }
      const tokenWeight = new BN(pairsReserves.reserveCoin) //
        .div(totalLiquidityToken)
        .toNumber();
      const tokenPairPrice = new BN(pairsReserves.reserveStable)
        .div(pairsReserves.reserveCoin)
        .toNumber();
      price += new BN(tokenWeight) //
        .times(tokenPairPrice)
        .toNumber();
    });

    return {
      address: asset.address,
      price: price,
      chainId: asset.chainId,
      currencyId: requestParams.currencyId,
    };
  }

  public static getStableTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
    wrappedCoinPrice: PriceResponse,
  ): PriceResponse {
    if (!asset) {
      return;
    }
    const stableCoinsMap = new Map<string, { reserveStable: string; reserveCoin: string }>();
    asset?.pairs.forEach((pair) => {
      const reserve = tokenReserves[pair.address];
      TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        reserve,
        asset.address,
        stableCoinsMap,
      );
    });

    const pairsReserves = stableCoinsMap.get(requestParams.protocol.coin);
    const tokenPairPrice = new BN(pairsReserves.reserveStable)
      .times(wrappedCoinPrice.price)
      .div(pairsReserves.reserveCoin)
      .toNumber();

    return {
      address: asset.address,
      price: tokenPairPrice,
      chainId: requestParams.chainId,
      currencyId: requestParams.currencyId,
    };
  }

  private static getCorrectTokenDecimals(decimals: Decimals): Decimals {
    return !decimals ? (decimals === 0 ? 0 : 18) : decimals;
  }
}
