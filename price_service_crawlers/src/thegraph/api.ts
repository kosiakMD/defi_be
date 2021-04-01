import axios, {AxiosResponse} from 'axios'
import {injectable} from 'inversify';
import * as uni from './uniswap';
import {UniswapLiquidityPositionsResponse} from './uniswap';
import * as bal from './balancer';
import * as sushi from './sushiswap';
import * as curve from './curve';

import endpoints from '../../config/endpoints';
import {
  CurveDataResponse,
  CurvePoolsTokensResponse, CurveSwapsResponse,
  getCurveLiquidityPositionsQuery,
  getCurvePoolsQuery, getCurveSwapsQuery
} from "./curve";
import { BalancerPoolsTokensResponse } from "./balancer"
import {TokenPriceRequest} from "../models/prices";

@injectable()
export class Api {


  //SUSHI
  public getSushiswapfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.firstTxTimestamp(),
    )
  }

  public getSushiswapfirstBlockQuery(timestamp: number): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.firstBlockAfterTimestamp(timestamp),
    )
  }

  public getSushiswapDailyBlockPricesQuery(block_number: number, token: string): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.firstDailyBlockPairs(block_number, token),
    )
  }

  public getSushiswapPoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.getSushiswapPoolsQuery(),
    )
  }
  public getCurrentSushiTokenPrices(address: string): Promise<AxiosResponse> {
    console.log(address)
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.getSushiswapCurrentPriceQuery(address),
    )
  }



   //UNI
   public getUniwapfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_UNISWAP,
      uni.firstTxTimestamp(),
    )
  }

  public getUniswapfirstBlockQuery(timestamp: number): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_UNISWAP,
      uni.firstBlockAfterTimestamp(timestamp),
    )
  }

  public getUniswapDailyBlockPricesQuery(block_number: number, token: string): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_UNISWAP,
      uni.firstDailyBlockPairs(block_number, token),
    )
  }

  public getUniswapPoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_UNISWAP,
      uni.getUniswapPoolsQuery(),
    )
  }
  public getCurrentUniTokenPrices(address: string): Promise<AxiosResponse> {
    console.log(address)
    return axios.post(
      endpoints.THEGRAPH_UNISWAP,
      uni.getUniswapCurrentPriceQuery(address),
    )
  }

  //BALANCER
  public getBalancerfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_BALANCER,
      bal.firstTxTimestamp(),
    )
  }

  public getBalancerfirstBlockQuery(timestamp: number): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_BALANCER,
      bal.firstBlockAfterTimestamp(timestamp),
    )
  }

  public getBalancerDailyBlockPricesQuery(block_number: number, token: string): Promise<AxiosResponse<BalancerPoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_BALANCER,
      bal.firstDailyBlockPairs(block_number, token),
    )
  }

  public getBalancerPoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post(
      endpoints.THEGRAPH_BALANCER,
      bal.getBalancerPoolsQuery(),
    )
  }
  
  //CURVE
  public getCurvePoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post<CurvePoolsTokensResponse>(
      endpoints.THEGRAPH_CURVE,
      getCurvePoolsQuery(),
    )
  }


  public getUniswapLiquidityPositions(address: string): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
    return axios.post<uni.UniswapLiquidityPositionsResponse>(
      endpoints.THEGRAPH_UNISWAP,
      uni.getLiquidityPositionsQuery(address),
    )
  }

  public getUniswapliquidityPositionSnapshots(address: string, skipLimit: number): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
    return axios.post<uni.UniswapLiquidityPositionsResponse>(
      endpoints.THEGRAPH_UNISWAP,
      uni.getliquidityPositionSnapshotsQuery(address, skipLimit),
    )
  }

  public getUniswapHistoricalLPTokensPrices(tokensPricesRequests: TokenPriceRequest[]): Promise<AxiosResponse<uni.UniswapPairDayDatasResponse>>{
    return axios.post(
        endpoints.THEGRAPH_UNISWAP,
        uni.getHistoricalLPTokensPricesQuery(tokensPricesRequests)
    )
  }

  public getUniswapCurrentLPTokensPrice(addresses: string[], timestamp: number): Promise<AxiosResponse<uni.UniswapPairDayDatasResponse>> {
    return  axios.post(
        endpoints.THEGRAPH_UNISWAP,
        uni.getCurrentLPTokensPriceQuery(addresses, timestamp)
    )
  }

  public getBalancerLiquidityPositions(address: string): Promise<AxiosResponse<bal.BalancerLiquidityPositionsResponse>> {
    return axios.post<bal.BalancerLiquidityPositionsResponse>(
      endpoints.THEGRAPH_BALANCER,
      bal.getLiquidityPositionsQuery(address),
    )
  }

  public getSushiswapLiquidityPositions(address: string): Promise<AxiosResponse<UniswapLiquidityPositionsResponse>> {
    return axios.post<UniswapLiquidityPositionsResponse>(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.getLiquidityPositionsQuery(address),
    )
  }

  public getSushiswapliquidityPositionSnapshots(address: string, skipLimit: number): Promise<AxiosResponse<sushi.UniswapLiquidityPositionsResponse>> {
    return axios.post<sushi.UniswapLiquidityPositionsResponse>(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.getliquidityPositionSnapshotsQuery(address, skipLimit),
    )
  }

  public getSushiswapHistoricalLPTokensPrices(tokensPricesRequests: TokenPriceRequest[]): Promise<AxiosResponse<sushi.SushiswapPairDayDatasResponse>>{
    return axios.post(
      endpoints.THEGRAPH_SUSHISWAP,
      sushi.getHistoricalLPTokensPricesQuery(tokensPricesRequests)
    )
  }

  public getSushiswapCurrentLPTokensPrice(addresses: string[], timestamp: number): Promise<AxiosResponse<sushi.SushiswapPairDayDatasResponse>> {
    return  axios.post(
      endpoints.THEGRAPH_UNISWAP,
      sushi.getCurrentLPTokensPriceQuery(addresses, timestamp)
    )
  }

 
  public getCurveLiquidityPositions(address: string): Promise<AxiosResponse<CurveDataResponse>> {
    return axios.post<CurveDataResponse>(
      endpoints.THEGRAPH_CURVE,
      getCurveLiquidityPositionsQuery(address),
    )
  }

  public getCurvePoolsTokensOld(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
    return axios.post<CurvePoolsTokensResponse>(
      endpoints.THEGRAPH_CURVE,
      getCurvePoolsQuery(),
    )
  }

  public getCurveSwaps(address: string): Promise<AxiosResponse<CurveSwapsResponse>> {
    return axios.post<CurveSwapsResponse>(
      endpoints.THEGRAPH_CURVE,
      getCurveSwapsQuery(address),
    )
  }
}
