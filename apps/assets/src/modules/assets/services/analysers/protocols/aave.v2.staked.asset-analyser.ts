import { AAVE_V2_STAKED_ABI } from 'apps/assets/src/common/abis/aave-v2-staked.abi';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { findAbiItemByName } from '../../../utils/abi';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';

@Injectable()
export class AaveV2StakedAssetAnalyser extends EVMAssetAnalyser implements AssetAnalyser {
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

  private async fetchAssetData(asset: AssetReference) {
    const underlyingAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'STAKED_TOKEN');
    const rewardAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'REWARD_TOKEN');
    const rewardVaultAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, 'REWARDS_VAULT');
    const governanceAbi: AbiItem = findAbiItemByName(AAVE_V2_STAKED_ABI, '_aaveGovernance');

    const contract = new DynamicContract(asset.address);
    try {
      return await this.multicall.callArray(
        [
          contract.createCall(underlyingAbi),
          contract.createCall(rewardAbi),
          contract.createCall(rewardVaultAbi),
          contract.createCall(governanceAbi),
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
