import { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CERC20_ABI } from '../../../../../common/abis/cerc20.abi';
import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { findAbiItemByName } from '../../../utils/abi';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';

@Injectable()
export class CErc20AssetAnalyser extends EVMAssetAnalyser implements AssetAnalyser {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const [token0, isCToken] = await this.fetchAssetData(asset);
    if (!token0 || !isCToken) {
      return;
    }

    return {
      categories: [AssetCategory.CompoundLP, AssetCategory.LpToken],
      underlying: [token0],
    };
  }

  canHandleCategories(codes: string[]): boolean {
    return codes.includes(AssetCategory.CompoundLP);
  }

  private async fetchAssetData(asset: AssetReference) {
    const underlyingAbi: AbiItem = findAbiItemByName(CERC20_ABI, 'underlying');
    const isCTokenAbi: AbiItem = findAbiItemByName(CERC20_ABI, 'isCToken');

    const contract = new DynamicContract(asset.address);
    try {
      return await this.multicall.callArray(
        [contract.createCall(underlyingAbi), contract.createCall(isCTokenAbi)],
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
