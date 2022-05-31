import { AbiItem, isAddress } from 'web3-utils';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetReference } from '../../../../../../common/types';

import { AssetAnalyser, AssetAnalysis } from './base.asset-analyser';

export abstract class EVMAssetAnalyser implements AssetAnalyser {
  protected constructor(protected readonly multicall: MulticallAggregator) {}

  abstract checkAsset(asset: AssetReference): Promise<AssetAnalysis> | AssetAnalysis;

  canCheckAsset(asset: AssetReference): Promise<boolean> | boolean {
    return isAddress(asset.address);
  }

  protected findAbiItem(abiItems: AbiItem[], name: string): AbiItem {
    return abiItems.find((item) => item.name === name);
  }
}
