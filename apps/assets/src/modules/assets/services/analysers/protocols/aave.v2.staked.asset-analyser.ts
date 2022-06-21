import { AAVE_V2_STAKED_ABI } from 'apps/assets/src/common/abis/aave-v2-staked.abi';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { chunkRunAsync, decimalsDivider, toBN } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UNIV2LP_ABI } from '../../../../../common/abis/univ2-lp.abi';
import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { findAbiItemByName } from '../../../utils/abi';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';
import {
  AssetPriceWithUnderlyingReserves,
  AssetPriceProvider,
  ComplexAsset,
} from '../core/price.provider';

@Injectable()
export class AaveV2StakedAssetAnalyser
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
    const [stakedToken, rewardToken, rewardsVault] = await this.fetchAssetData(asset);

    return {
      categories: [
        AssetCategory.WithSingleUnderlyingToken,
        AssetCategory.UnderlyingBalanceHeldByBaseContract,
        AssetCategory.TokenizedPosition,
      ], // 1:1 wrapped asset?
      underlying: [stakedToken],
      metadata: {
        rewardToken,
        rewardsVault,
      },
    };
  }

  canHandleCategories(codes: string[]): boolean {
    return codes.includes(AssetCategory.UniSwapV2LikeLP);
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    const getReservesAbi: AbiItem = findAbiItemByName(UNIV2LP_ABI, 'getReserves');
    const totalSupplyAbi: AbiItem = findAbiItemByName(UNIV2LP_ABI, 'totalSupply');

    const calls = assets.reduce((all, asset) => {
      const contract = new DynamicContract(asset.address);
      return all.concat([contract.createCall(getReservesAbi), contract.createCall(totalSupplyAbi)]);
    }, new Array<CallData>());

    const responses = await chunkRunAsync(calls, 1000, (chunk) =>
      this.multicall.callArray(chunk, chainId),
    );

    const prices: AssetPriceWithUnderlyingReserves[] = [];

    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const [asset0, asset1] = asset.underlying;
      const { _reserve0, _reserve1 } = responses[2 * index];
      const totalSupply = responses[2 * index + 1];

      const assetReference = { chainId, address: asset.address };

      if (!asset0.price && !asset1.price) {
        prices.push({
          asset: assetReference,
          price: null,
          reserves: [_reserve0, _reserve1],
        });
        continue;
      }

      const oneTokenPoolValue = asset0.price
        ? toBN(_reserve0) //
            .dividedBy(decimalsDivider(asset0.decimals))
            .multipliedBy(asset0.price)
        : toBN(_reserve1) //
            .dividedBy(decimalsDivider(asset1.decimals))
            .multipliedBy(asset1.price);

      const totalPoolValue = oneTokenPoolValue.multipliedBy(2);
      const price = totalPoolValue
        .multipliedBy(decimalsDivider(asset.decimals))
        .dividedBy(totalSupply);

      prices.push({
        asset: assetReference,
        price: price.toNumber(),
        reserves: [_reserve0, _reserve1],
      });
    }

    return prices;
  }

  private async fetchAssetData(asset: AssetReference) {
    const underlyingAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'STAKED_TOKEN');
    const rewardAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'REWARD_TOKEN');
    const rewardVaultAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'REWARDS_VAULT');
    const governanceAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, '_aaveGovernance');
    // const token0: AbiItem = findAbiItemByName(UNIV2LP_ABI, 'token0');

    const contract = new DynamicContract(asset.address);
    try {
      return await this.multicall.callArray(
        [
          contract.createCall(underlyingAbi),
          contract.createCall(rewardAbi),
          contract.createCall(rewardVaultAbi),
          contract.createCall(governanceAbi),
          //   contract.createCall(token0),
        ],
        asset.chainId,
      );
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
}
