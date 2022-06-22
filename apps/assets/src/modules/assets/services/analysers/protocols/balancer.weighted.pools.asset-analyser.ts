import { BALANCER_POOL_TOKEN_ABI } from 'apps/assets/src/common/abis/balancer-pool-token.abi';
import { BALANCER_WEIGHTED_POOL_ABI } from 'apps/assets/src/common/abis/balancer-weighted-pool.abi';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { chunk, chunkRunAsync, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { findAbiItemByName } from '../../../utils/abi';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';
import {
  AssetPriceProvider,
  AssetPriceWithUnderlyingReserves,
  ComplexAsset,
} from '../core/price.provider';

@Injectable()
export class BalancerWeightedAssetAnalyser
  extends EVMAssetAnalyser
  implements AssetAnalyser, AssetPriceProvider
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const [underlying, bPool] = await this.fetchAssetData(asset);

    return {
      categories: [
        AssetCategory.LpToken,
        AssetCategory.BalancerLp,
        AssetCategory.BalancerWeightedLpToken,
      ],
      underlying,
      metadata: {
        bPool,
      },
    };
  }
  private async fetchAssetData(asset: AssetReference) {
    // token
    const bPoolAbi: AbiItem = findAbiItemByName(BALANCER_WEIGHTED_POOL_ABI, 'bPool');
    const bFactoryAbi: AbiItem = findAbiItemByName(BALANCER_WEIGHTED_POOL_ABI, 'bFactory');
    // pool
    const currentTokensAbi: AbiItem = findAbiItemByName(
      BALANCER_POOL_TOKEN_ABI,
      'getCurrentTokens',
    );

    const token = new DynamicContract(asset.address);
    try {
      const [bPool] = await this.multicall.callArray(
        [token.createCall(bPoolAbi), token.createCall(bFactoryAbi)],
        asset.chainId,
      );
      const pool = new DynamicContract(bPool);
      const currentTokens = await this.multicall.call(
        pool.createCall(currentTokensAbi),
        asset.chainId,
      );
      return [currentTokens, bPool];
    } catch (e) {
      if (
        e.message.indexOf('execution reverted') < 0 &&
        e.message.indexOf('VM execution error') < 0 &&
        e.message.indexOf("Returned values aren't valid") < 0
      ) {
        throw e;
      }
      this.logger.warn(
        `could not fetch token data, error: [${e.message}], analysis will be skipped`,
      );
    }
  }

  canHandleCategories(codes: string[]): boolean {
    return codes.includes(AssetCategory.BalancerWeightedLpToken);
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    // TODO: grab metadata from ComplexAsset if/when possible
    const bPoolAbi: AbiItem = findAbiItemByName(BALANCER_WEIGHTED_POOL_ABI, 'bPool');
    const totalSupplyAbi: AbiItem = findAbiItemByName(BALANCER_WEIGHTED_POOL_ABI, 'totalSupply');

    const assetCalls = assets.flatMap((asset) => {
      const token = new DynamicContract(asset.address);
      return [token.createCall(bPoolAbi), token.createCall(totalSupplyAbi)];
    });

    const chunkedAssetResults = chunk(await this.multicall.callArray(assetCalls, chainId), 2); // 2 for number of calls per asset (bPool, totalSupply)

    const weightAbi: AbiItem = findAbiItemByName(BALANCER_POOL_TOKEN_ABI, 'getNormalizedWeight');
    const balanceAbi: AbiItem = findAbiItemByName(BALANCER_POOL_TOKEN_ABI, 'getBalance');

    const calls = assets.flatMap((asset, idx) => {
      const [bPool] = chunkedAssetResults[idx];
      const contract = new DynamicContract(bPool);
      return asset.underlying.flatMap((under) => [
        contract.createCall(weightAbi, under.address),
        contract.createCall(balanceAbi, under.address),
      ]);
    }, new Array<CallData>());

    const responses = await chunkRunAsync(calls, 1000, (chunk) =>
      this.multicall.callArray(chunk, chainId),
    );

    const chunks = [];
    assets.forEach((asset) => {
      chunks.push(responses.splice(0, asset.underlying.length * 2));
    });

    const prices: AssetPriceWithUnderlyingReserves[] = [];
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const data = chunks[index];
      const { underlying } = asset;
      const assetReference = { chainId, address: asset.address };
      const weights = underlying.map((u, i) => Number(data[i * 2].toString()) / 1e18);
      const reserves = underlying.map((u, i) => data[i * 2 + 1].toFixed());

      // TODO: get reserves for each token in position
      const indexFirstWithPrice = underlying.findIndex((t) => t.price);

      if (indexFirstWithPrice === -1) {
        prices.push({
          asset: assetReference,
          price: null,
          reserves,
        });
        continue;
      }

      /**
       * @notice Opted to calculate the total LP token price from a single
       * underlying asset (adjusted for weight) instead of the total underlying value
       * to reduce likelyhood of an underlying token missing price and not being included
       */

      // get the TVL of the first token with price
      const tvlToken =
        normalizeDecimals(reserves[indexFirstWithPrice], underlying[indexFirstWithPrice].decimals) *
        underlying[indexFirstWithPrice].price;

      // Offset by token weight to get actual TVL
      const tvl = tvlToken / weights[indexFirstWithPrice];

      const [, totalSupply] = chunkedAssetResults[index];
      const price = tvl / weights[indexFirstWithPrice] / normalizeDecimals(totalSupply, 18);

      prices.push({
        asset: assetReference,
        price,
        reserves,
      });
    }
    return prices;
  }
}
