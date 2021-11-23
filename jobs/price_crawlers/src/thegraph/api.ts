import axios, { AxiosResponse } from 'axios';
import { injectable } from 'inversify';

import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import endpoints from '../config/endpoints';
import { TokenPriceRequest } from '../models/prices';
import { PoolsTokensResponse } from './common';
import * as pancake from './pancake';
import * as sushi from './sushiswap';
import * as uni from './uniswap';

// TODO: use config service
const sushiSwapUrl = endpoints.THEGRAPH_SUSHISWAP;
const uniSwapUrl = endpoints.THEGRAPH_UNISWAP;
const pancakeUrl = endpoints.THEGRAPH_PANCAKE;

@injectable()
export class Api {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  // SushiSwap
  public getSushiSwapFirstTxTimestamp(): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(sushiSwapUrl, sushi.firstTxTimestamp());
  }

  public getSushiSwapFirstBlockQuery(
    timestamp: number,
  ): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(sushiSwapUrl, sushi.firstBlockAfterTimestamp(timestamp));
  }

  public getSushiSwapDailyBlockPricesQuery(
    blockNumber: number,
    token: string,
  ): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(sushiSwapUrl, sushi.firstDailyBlockPairs(blockNumber, token));
  }

  public getSushiSwapPoolsTokens(skip = 0): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(sushiSwapUrl, sushi.getSushiswapPoolsQuery(skip));
  }

  public getCurrentSushiTokenPrices(address: string): Promise<AxiosResponse> {
    return axios.post(sushiSwapUrl, sushi.getSushiswapCurrentPriceQuery(address));
  }

  public getSushiSwapLiquidityPositionSnapshots(
    address: string,
    skipLimit: number,
  ): Promise<AxiosResponse<sushi.UniswapLiquidityPositionsResponse>> {
    return axios.post<sushi.UniswapLiquidityPositionsResponse>(
      sushiSwapUrl,
      sushi.getliquidityPositionSnapshotsQuery(address, skipLimit),
    );
  }

  public getSushiSwapHistoricalLPTokensPrices(
    tokensPricesRequests: TokenPriceRequest[],
  ): Promise<AxiosResponse<sushi.SushiswapPairDayDatasResponse>> {
    return axios.post(sushiSwapUrl, sushi.getHistoricalLPTokensPricesQuery(tokensPricesRequests));
  }

  // UniSwap
  public getUniswapFirstBlockQuery(timestamp: number): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(uniSwapUrl, uni.firstBlockAfterTimestamp(timestamp));
  }

  public getUniswapDailyBlockPricesQuery(
    blockNumber: number,
    token: string,
  ): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(uniSwapUrl, uni.firstDailyBlockPairs(blockNumber, token));
  }

  public getUniswapPoolsTokens(skip = 0): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(uniSwapUrl, uni.getUniswapPoolsQuery(skip));
  }

  public getCurrentUniTokenPrices(address: string): Promise<AxiosResponse> {
    this.logger.log(address);
    return axios.post(uniSwapUrl, uni.getUniswapCurrentPriceQuery(address));
  }

  public getUniSwapLiquidityPositions(
    address: string,
  ): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
    return axios.post<uni.UniswapLiquidityPositionsResponse>(
      uniSwapUrl,
      uni.getLiquidityPositionsQuery(address),
    );
  }

  public getUniSwapLiquidityPositionSnapshots(
    address: string,
    skipLimit: number,
  ): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
    return axios.post<uni.UniswapLiquidityPositionsResponse>(
      uniSwapUrl,
      uni.getliquidityPositionSnapshotsQuery(address, skipLimit),
    );
  }

  public getUniSwapCurrentLPTokensPrice(
    addresses: string[],
    timestamp: number,
  ): Promise<AxiosResponse<uni.UniswapPairDayDatasResponse>> {
    return axios.post(uniSwapUrl, uni.getCurrentLPTokensPriceQuery(addresses, timestamp));
  }

  // Pancake
  public getPancakePoolsTokens(skip = 0): Promise<AxiosResponse<PoolsTokensResponse>> {
    return axios.post(pancakeUrl, pancake.getPancakePoolsQuery(skip));
  }

  public getCurrentPancakeTokenPrices(address: string): Promise<AxiosResponse> {
    this.logger.log(address);
    return axios.post(pancakeUrl, pancake.getPancakeCurrentPriceQuery(address));
  }
}
