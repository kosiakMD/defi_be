import { AAVE_V2_STAKED_ABI } from 'apps/assets/src/common/abis/aave-v2-staked.abi';
import { BALANCER_POOL_TOKEN_ABI } from 'apps/assets/src/common/abis/balancer-pool-token.abi';
import { BALANCER_WEIGHTED_POOL_ABI } from 'apps/assets/src/common/abis/balancer-weighted-pool.abi';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { chunkRunAsync } from '@app/common/utils';
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
    console.log({ underlying });
    return {
      categories: [
        AssetCategory.LpToken,
        AssetCategory.BalancerLp,
        AssetCategory.BalancerWeightedLpToken,
      ], // 1:1 wrapped asset?
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
        [
          token.createCall(bPoolAbi),
          token.createCall(bFactoryAbi),
          //   token.createCall(getDenormalizedWeightAbi),
        ],
        asset.chainId,
      );
      const pool = new DynamicContract(bPool);
      const [currentTokens] = await this.multicall.callArray(
        [
          pool.createCall(currentTokensAbi),
          // pool.createCall(weightAbi)
        ],
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
    return codes.includes(AssetCategory.UniSwapV2LikeLP);
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    // const weightAbi: AbiItem = findAbiItemByName(BALANCER_POOL_TOKEN_ABI, 'getNormalizedWeight');
    // const balanceAbi: AbiItem = findAbiItemByName(BALANCER_POOL_TOKEN_ABI, 'getBalance');
    // const calls = assets.reduce((all, asset) => {
    //   const contract = new DynamicContract(asset.address);
    //   return all.concat(
    //     asset.underlying.flatMap((under) => [
    //       contract.createCall(weightAbi, under.address),
    //       contract.createCall(balanceAbi, under.address),
    //     ]),
    //   );
    // }, new Array<CallData>());
    // const responses = await chunkRunAsync(calls, 1000, (chunk) =>
    //   this.multicall.callArray(chunk, chainId),
    // );
    // const prices: AssetPriceWithUnderlyingReserves[] = [];
    // for (let index = 0; index < assets.length; index++) {
    //   const asset = assets[index];
    //   const { underlying } = asset;
    //   // doesn't work since N tokens
    //   //   const weight = responses[2 * index];
    //   //   const balance = responses[2 * index + 1];
    //   const assetReference = { chainId, address: asset.address };
    //   if (!asset0.price && !asset1.price) {
    //     prices.push({
    //       asset: assetReference,
    //       price: null,
    //       reserves: [_reserve0, _reserve1],
    //     });
    //     continue;
    //   }
    //   const oneTokenPoolValue = asset0.price
    //     ? toBN(_reserve0) //
    //         .dividedBy(decimalsDivider(asset0.decimals))
    //         .multipliedBy(asset0.price)
    //     : toBN(_reserve1) //
    //         .dividedBy(decimalsDivider(asset1.decimals))
    //         .multipliedBy(asset1.price);
    //   const totalPoolValue = oneTokenPoolValue.multipliedBy(2);
    //   const price = totalPoolValue
    //     .multipliedBy(decimalsDivider(asset.decimals))
    //     .dividedBy(totalSupply);
    //   prices.push({
    //     asset: assetReference,
    //     price: price.toNumber(),
    //     reserves: [_reserve0, _reserve1],
    //   });
    // }
    // return prices;
  }
}
