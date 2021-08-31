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

export class TokenPriceService {
  public static getTokensPriceResponse(
    requestParams: LambdaRequestInterface,
    pairsReserves: UniswapReservesResult,
    assets: AssetsApiResponse[],
  ): PriceResponse[] {
    const wrappedCoin = assets.find((asset) => asset.address === requestParams.protocol.coin);
    const wrappedCoinPrice = TokenPriceService.getWrappedTokenPrice(
      wrappedCoin,
      pairsReserves.reserves,
      requestParams,
    );

    return assets.map((asset) => {
      if (asset.address === wrappedCoin.address) {
        return wrappedCoinPrice;
      } else if (requestParams.stableCoins.find((address) => address === asset.address)) {
        return TokenPriceService.getStableTokenPrice(
          asset,
          pairsReserves.reserves,
          requestParams,
          wrappedCoinPrice,
        );
      }
      return TokenPriceService.getTokenPrice(
        asset,
        pairsReserves.reserves,
        requestParams,
        wrappedCoinPrice,
      );
    });
  }

  public static getTokenReserveAndModifyFields(
    pair: Pair,
    assetPairsReserves: UniswapPairReserves,
    assetAddress: string,
    stableCoinsMap: Map<string, StableCoinMapValue>,
  ): number {
    [pair.tokens[0].reserved, pair.tokens[1].reserved] =
      pair.tokens[0].pairPosition === 0
        ? [assetPairsReserves.reserve0, assetPairsReserves.reserve1]
        : [assetPairsReserves.reserve1, assetPairsReserves.reserve0];

    if (pair.tokens[0]?.tokenAddress === assetAddress) {
      stableCoinsMap.set(pair.tokens[1].tokenAddress, {
        reserveStable: pair.tokens[1].reserved,
        reserveCoin: pair.tokens[0].reserved,
      });
      return Number(pair.tokens[0].reserved);
    }
    stableCoinsMap.set(pair.tokens[0]?.tokenAddress, {
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
    let totalLiquidityToken = 0;
    const stableCoinsMap = new Map<string, { reserveStable: string; reserveCoin: string }>();
    asset.pairs.forEach((pair) => {
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
      price += new BN(tokenWeight) //
        .times(tokenPairPrice)
        .toNumber();
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
    const stableCoinsMap = new Map<string, StableCoinMapValue>();
    let totalLiquidityToken = 0;
    asset.pairs.forEach((pair) => {
      const assetPairsReserves = tokenReserves[pair.address];
      totalLiquidityToken += TokenPriceService.getTokenReserveAndModifyFields(
        pair,
        assetPairsReserves,
        asset.address,
        stableCoinsMap,
      );
    });

    let price = 0;
    requestParams.stableCoins.forEach((coin) => {
      if (coin === asset.address) {
        return;
      }
      const pairsReserves = stableCoinsMap.get(coin);
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
    const stableCoinsMap = new Map<string, { reserveStable: string; reserveCoin: string }>();
    asset.pairs.forEach((pair) => {
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
}
