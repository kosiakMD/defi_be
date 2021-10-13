import BigNumber, { BigNumber as BN } from 'bignumber.js';

import {
  UniswapPairReserves,
  UniswapReservesData,
  UniswapReservesResult,
} from './chain/multicall/types/token';
import {
  AssetsApiResponse,
  CurrentPrice,
  LambdaRequestInterface,
  Pair,
  PriceResponse,
  StableCoinMapValue,
} from './interfaces';
import { LOGGER } from './logger/logger';
import { Decimals, decimalsReserve } from './util';
import { LIQUIDITY_LIMIT, zeroAddress } from './utils/constants';

export class TokenPriceService {
  public static getTokensPriceResponse(
    requestParams: LambdaRequestInterface,
    pairsReserves: UniswapReservesResult,
    assets: AssetsApiResponse[],
    priceResponse: CurrentPrice,
    stableCoinsMap: Map<string, AssetsApiResponse>,
  ): PriceResponse[] {
    try {
      const wrappedCoin = assets.find((asset) => asset.address === requestParams.wrappedCoin);
      const wrappedCoinPrice = TokenPriceService.getWrappedTokenPrice(
        wrappedCoin,
        pairsReserves.reserves,
        requestParams,
        priceResponse,
      );

      const stableTokensPrice = new Map<string, PriceResponse>();
      stableCoinsMap.forEach((value) => {
        stableTokensPrice.set(
          value.address,
          TokenPriceService.getStableTokenPrice(
            value,
            pairsReserves.reserves,
            requestParams,
            wrappedCoinPrice,
            priceResponse,
          ),
        );
      });

      const tokensPrices = assets
        .filter((asset) => asset?.pairs?.length)
        .map((asset) => {
          const argumentsArray = [
            asset,
            pairsReserves.reserves,
            requestParams,
            wrappedCoinPrice,
            priceResponse,
            stableTokensPrice,
          ];
          if (asset.address === wrappedCoin.address) {
            return wrappedCoinPrice;
          }
          const stablePrice = stableTokensPrice.get(asset.address);
          if (asset.address === stablePrice?.address) {
            return stablePrice;
          }
          return TokenPriceService.getTokenPrice.apply(this, argumentsArray);
        });

      tokensPrices.push({
        address: zeroAddress,
        price: wrappedCoinPrice.price,
        chainId: requestParams.chainId,
        currencyId: requestParams.currencyId,
      });
      return tokensPrices;
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
    priceResponse: any,
  ) {
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
      const reserveTokenUsd = new BigNumber(pair.tokens[1].reserved)
        .times(priceResponse[pair.tokens[1].tokenAddress])
        .toNumber();
      if (reserveTokenUsd >= LIQUIDITY_LIMIT) {
        const value: StableCoinMapValue = {
          stableAddress: pair.tokens[1].tokenAddress,
          reserveStable: pair.tokens[1].reserved,
          reserveCoin: pair.tokens[0].reserved,
          reserveUsd: reserveTokenUsd * 2,
        };

        stableCoinsReserveMap.set(pair.tokens[1].tokenAddress, value);
        return value;
      }
    }

    const reserveTokenUsd = new BigNumber(pair.tokens[0].reserved)
      .times(priceResponse[pair.tokens[0].tokenAddress])
      .toNumber();
    if (reserveTokenUsd >= LIQUIDITY_LIMIT) {
      const value: StableCoinMapValue = {
        stableAddress: pair.tokens[0]?.tokenAddress,
        reserveStable: pair.tokens[0].reserved,
        reserveCoin: pair.tokens[1].reserved,
        reserveUsd: reserveTokenUsd * 2,
      };

      stableCoinsReserveMap.set(pair.tokens[0]?.tokenAddress, value);
      return value;
    }
  }

  public static getTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
    wrappedCoinPrice: PriceResponse,
    priceResponse: any,
    stableTokensPrice: Map<string, PriceResponse>,
  ): PriceResponse {
    if (asset) {
      const stableCoinsMap = new Map<string, StableCoinMapValue>();
      const value = TokenPriceService.mapReservesResults(
        tokenReserves,
        asset,
        priceResponse,
        stableCoinsMap,
      );

      if (value.reserveUsd) {
        const stablePrice = stableTokensPrice.get(value.stableAddress);
        const price =
          value.stableAddress === wrappedCoinPrice.address
            ? new BN(value.reserveStable)
                .times(wrappedCoinPrice.price) //
                .div(value.reserveCoin)
                .toNumber()
            : new BN(value.reserveStable) //
                .times(stablePrice.price)
                .div(value.reserveCoin)
                .toNumber();

        return {
          address: asset.address,
          price: price,
          chainId: requestParams.chainId,
          currencyId: requestParams.currencyId,
        };
      }
    }
  }

  public static getWrappedTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
    priceResponse: any,
  ): PriceResponse {
    if (!asset) {
      return;
    }
    const stableCoinsValuesMap = new Map<string, StableCoinMapValue>();
    let value = TokenPriceService.getEmptyStableCoinMapValue();
    asset?.pairs.forEach((pair) => {
      const assetPairsReserves = tokenReserves[pair.address];
      const result = TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        assetPairsReserves,
        asset.address,
        stableCoinsValuesMap,
        priceResponse,
      );

      const whiteListAddress = requestParams.whiteListCoins.find(
        (address) => address === result?.stableAddress,
      );

      value = !result || value.reserveUsd > result?.reserveUsd || whiteListAddress ? value : result;
    });

    return {
      address: asset.address,
      price: new BN(value.reserveStable) //
        .div(value.reserveCoin)
        .toNumber(),
      chainId: asset.chainId,
      currencyId: requestParams.currencyId,
    };
  }

  public static getStableTokenPrice(
    asset: AssetsApiResponse,
    tokenReserves: UniswapReservesData,
    requestParams: LambdaRequestInterface,
    wrappedCoinPrice: PriceResponse,
    priceResponse: CurrentPrice,
  ): PriceResponse {
    if (asset && asset.address !== requestParams.wrappedCoin) {
      const stableCoinsMap = new Map<string, StableCoinMapValue>();
      const value = TokenPriceService.mapReservesResults(
        tokenReserves,
        asset,
        priceResponse,
        stableCoinsMap,
      );

      const pairsReserves = stableCoinsMap.get(requestParams.wrappedCoin);
      if (!pairsReserves && value.reserveUsd) {
        return {
          address: asset.address,
          price: new BN(value.reserveStable) //
            .div(value.reserveCoin)
            .toNumber(),
          chainId: requestParams.chainId,
          currencyId: requestParams.currencyId,
        };
      }
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
  }

  private static getCorrectTokenDecimals(decimals: Decimals): Decimals {
    return decimals || (decimals ?? 18);
  }

  private static getEmptyStableCoinMapValue(): StableCoinMapValue {
    return {
      stableAddress: null,
      reserveStable: null,
      reserveCoin: null,
      reserveUsd: 0,
    };
  }

  private static mapReservesResults(
    tokenReserves: UniswapReservesData,
    asset: AssetsApiResponse,
    priceResponse: CurrentPrice,
    stableCoinsMap: Map<string, StableCoinMapValue>,
  ): StableCoinMapValue {
    let value = TokenPriceService.getEmptyStableCoinMapValue();
    asset?.pairs.forEach((pair) => {
      const reserve = tokenReserves[pair.address];
      const result = TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        reserve,
        asset.address,
        stableCoinsMap,
        priceResponse,
      );

      value = !result || value.reserveUsd > result?.reserveUsd ? value : result;
    });

    return value;
  }
}
