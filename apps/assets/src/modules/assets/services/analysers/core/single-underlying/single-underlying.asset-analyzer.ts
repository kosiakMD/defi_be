import { AbiItem } from 'web3-utils';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { isEVMChain } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetReference } from '../../../../../../common/types';

import { AssetCategory } from '../../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../asset.analyser';

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

    // Most Aave-like tokens https://etherscan.io/address/0x030ba81f1c18d280636f32af80b9aad02cf0854e#readProxyContract
    const underlyingAbiItem1: AbiItem = {
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
    // Appears on unwrapped aave tokens like https://etherscan.io/address/0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04#readContract
    const underlyingAbiItem2: AbiItem = {
      inputs: [],
      name: 'underlyingAssetAddress',
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

    // All
    const poolAbiItem: AbiItem = {
      inputs: [],
      name: 'POOL',
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

    const calls = [
      this.multicall.call(contract.createCall(underlyingAbiItem1), asset.chainId).catch(() => null),
      this.multicall.call(contract.createCall(underlyingAbiItem2), asset.chainId).catch(() => null),
      this.multicall.call(contract.createCall(poolAbiItem), asset.chainId).catch(() => null),
    ];

    const [underlyingAddress1, underlyingAddress2, poolAddress] = await Promise.all(calls);

    if (!underlyingAddress1 && !underlyingAddress2) {
      return;
    }
    const categories = [AssetCategory.WithSingleUnderlyingToken];

    const underlyingAddress = underlyingAddress1 || underlyingAddress2;

    if ((poolAddress && underlyingAddress1) || underlyingAbiItem2) {
      // Aave, aave forks. Please add other tokens exchangeable one-to-one here.
      categories.push(AssetCategory.OneToOneUnderlyingToBaseTokenExchange);
    }

    return {
      categories,
      underlying: [underlyingAddress],
    };
  }
}
