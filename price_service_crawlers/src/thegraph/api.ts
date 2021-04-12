import { Inject, LoggerService } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { injectable } from 'inversify';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import endpoints from '../../config/endpoints';
import { TokenPriceRequest } from '../models/prices';
import * as bal from './balancer';
import { BalancerPoolsTokensResponse } from './balancer';
import * as curve from './curve';
import {
	CurveDataResponse,
	CurvePoolsTokensResponse,
	CurveSwapsResponse,
	getCurveLiquidityPositionsQuery,
	getCurvePoolsQuery,
	getCurveSwapsQuery,
} from './curve';
import * as sushi from './sushiswap';
import * as uni from './uniswap';
import { UniswapLiquidityPositionsResponse } from './uniswap';

// TODO: use config service
const sushiswapUrl = endpoints.THEGRAPH_SUSHISWAP;
const uniswapUrl = endpoints.THEGRAPH_UNISWAP;
const balancerUrl = endpoints.THEGRAPH_BALANCER;
const curveUrl = endpoints.THEGRAPH_CURVE;

@injectable()
export class Api {
	constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}
	//SUSHI
	public getSushiswapfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(sushiswapUrl, sushi.firstTxTimestamp());
	}

	public getSushiswapfirstBlockQuery(
		timestamp: number,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(sushiswapUrl, sushi.firstBlockAfterTimestamp(timestamp));
	}

	public getSushiswapDailyBlockPricesQuery(
		blockNumber: number,
		token: string,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(sushiswapUrl, sushi.firstDailyBlockPairs(blockNumber, token));
	}

	public getSushiswapPoolsTokens(skip = 0): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(sushiswapUrl, sushi.getSushiswapPoolsQuery(skip));
	}
	public getCurrentSushiTokenPrices(address: string): Promise<AxiosResponse> {
		this.logger.log(address);
		return axios.post(sushiswapUrl, sushi.getSushiswapCurrentPriceQuery(address));
	}

	//UNI
	public getUniwapfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(uniswapUrl, uni.firstTxTimestamp());
	}

	public getUniswapfirstBlockQuery(
		timestamp: number,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(uniswapUrl, uni.firstBlockAfterTimestamp(timestamp));
	}

	public getUniswapDailyBlockPricesQuery(
		blockNumber: number,
		token: string,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(uniswapUrl, uni.firstDailyBlockPairs(blockNumber, token));
	}

	public getUniswapPoolsTokens(skip = 0): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(uniswapUrl, uni.getUniswapPoolsQuery(skip));
	}
	public getCurrentUniTokenPrices(address: string): Promise<AxiosResponse> {
		this.logger.log(address);
		return axios.post(uniswapUrl, uni.getUniswapCurrentPriceQuery(address));
	}

	//BALANCER
	public getBalancerfirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(balancerUrl, bal.firstTxTimestamp());
	}

	public getBalancerfirstBlockQuery(
		timestamp: number,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(balancerUrl, bal.firstBlockAfterTimestamp(timestamp));
	}

	public getBalancerDailyBlockPricesQuery(
		blockNumber: number,
		token: string,
	): Promise<AxiosResponse<BalancerPoolsTokensResponse>> {
		return axios.post(balancerUrl, bal.firstDailyBlockPairs(blockNumber, token));
	}

	public getBalancerPoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(balancerUrl, bal.getBalancerPoolsQuery());
	}

	//CURVE
	public getCurvePoolsTokens(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post<CurvePoolsTokensResponse>(curveUrl, getCurvePoolsQuery());
	}

	public getCurvefirstTxTimestamp(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(curveUrl, curve.firstTxTimestamp());
	}

	public getCurvefirstBlockQuery(
		timestamp: number,
	): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post(curveUrl, curve.firstBlockAfterTimestamp(timestamp));
	}

	public getCurveDailyBlockPricesQuery(
		blockNumber: number,
		token: string,
	): Promise<AxiosResponse<BalancerPoolsTokensResponse>> {
		return axios.post(curveUrl, curve.firstDailyBlockPairs(blockNumber, token));
	}

	public getUniswapLiquidityPositions(
		address: string,
	): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
		return axios.post<uni.UniswapLiquidityPositionsResponse>(
			uniswapUrl,
			uni.getLiquidityPositionsQuery(address),
		);
	}

	public getUniswapliquidityPositionSnapshots(
		address: string,
		skipLimit: number,
	): Promise<AxiosResponse<uni.UniswapLiquidityPositionsResponse>> {
		return axios.post<uni.UniswapLiquidityPositionsResponse>(
			uniswapUrl,
			uni.getliquidityPositionSnapshotsQuery(address, skipLimit),
		);
	}

	public getUniswapHistoricalLPTokensPrices(
		tokensPricesRequests: TokenPriceRequest[],
	): Promise<AxiosResponse<uni.UniswapPairDayDatasResponse>> {
		return axios.post(uniswapUrl, uni.getHistoricalLPTokensPricesQuery(tokensPricesRequests));
	}

	public getUniswapCurrentLPTokensPrice(
		addresses: string[],
		timestamp: number,
	): Promise<AxiosResponse<uni.UniswapPairDayDatasResponse>> {
		return axios.post(uniswapUrl, uni.getCurrentLPTokensPriceQuery(addresses, timestamp));
	}

	public getBalancerLiquidityPositions(
		address: string,
	): Promise<AxiosResponse<bal.BalancerLiquidityPositionsResponse>> {
		return axios.post<bal.BalancerLiquidityPositionsResponse>(
			balancerUrl,
			bal.getLiquidityPositionsQuery(address),
		);
	}

	public getSushiswapLiquidityPositions(
		address: string,
	): Promise<AxiosResponse<UniswapLiquidityPositionsResponse>> {
		return axios.post<UniswapLiquidityPositionsResponse>(
			sushiswapUrl,
			sushi.getLiquidityPositionsQuery(address),
		);
	}

	public getSushiswapliquidityPositionSnapshots(
		address: string,
		skipLimit: number,
	): Promise<AxiosResponse<sushi.UniswapLiquidityPositionsResponse>> {
		return axios.post<sushi.UniswapLiquidityPositionsResponse>(
			sushiswapUrl,
			sushi.getliquidityPositionSnapshotsQuery(address, skipLimit),
		);
	}

	public getSushiswapHistoricalLPTokensPrices(
		tokensPricesRequests: TokenPriceRequest[],
	): Promise<AxiosResponse<sushi.SushiswapPairDayDatasResponse>> {
		return axios.post(sushiswapUrl, sushi.getHistoricalLPTokensPricesQuery(tokensPricesRequests));
	}

	public getSushiswapCurrentLPTokensPrice(
		addresses: string[],
		timestamp: number,
	): Promise<AxiosResponse<sushi.SushiswapPairDayDatasResponse>> {
		return axios.post(uniswapUrl, sushi.getCurrentLPTokensPriceQuery(addresses, timestamp));
	}

	public getCurveLiquidityPositions(address: string): Promise<AxiosResponse<CurveDataResponse>> {
		return axios.post<CurveDataResponse>(curveUrl, getCurveLiquidityPositionsQuery(address));
	}

	public getCurvePoolsTokensOld(): Promise<AxiosResponse<CurvePoolsTokensResponse>> {
		return axios.post<CurvePoolsTokensResponse>(curveUrl, getCurvePoolsQuery());
	}

	public getCurveSwaps(address: string): Promise<AxiosResponse<CurveSwapsResponse>> {
		return axios.post<CurveSwapsResponse>(curveUrl, getCurveSwapsQuery(address));
	}
}
