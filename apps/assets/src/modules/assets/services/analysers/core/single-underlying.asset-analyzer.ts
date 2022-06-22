import { BigNumber } from 'bignumber.js';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { isEVMChain } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

@Injectable()
export class SingleUnderlyingAssetAnalyser implements AssetAnalyser {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  async canAnalyseAsset(asset: AssetReference): Promise<boolean> {
    return isEVMChain(asset.chainId);
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const contract = new DynamicContract(asset.address);

    const underlyingAbiItem: AbiItem = {
      inputs: [],
      name: 'UNDERLYING_ASSET_ADDRESS',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    };

    const underlyingAddress = await this.multicall.call(
      contract.createCall(underlyingAbiItem),
      asset.chainId,
    );
    const underlyingContract = new ERC20(underlyingAddress);
    const underlyingTokenHeldByBaseContractCall = underlyingContract.balanceOf(asset.address);

    const underlyingTokenHeldByBaseContract = await this.multicall.call(
      underlyingTokenHeldByBaseContractCall,
      asset.chainId,
    );
    const categories = [AssetCategory.WithSingleUnderlyingToken];
    if (new BigNumber(underlyingTokenHeldByBaseContract).gt(0)) {
      categories.push(AssetCategory.UnderlyingBalanceHeldByBaseContract);
    }

    return {
      categories,
      underlying: [underlyingAddress],
    };
  }
}
