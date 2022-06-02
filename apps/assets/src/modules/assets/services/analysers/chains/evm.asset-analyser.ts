import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';

import { ERC20 } from '../../../../../common/contracts/erc20.contract';
import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';

// TODO: Handle native coins
@Injectable()
export class EVMMetaDataStrategy extends EVMAssetAnalyser {
  constructor(private readonly web3Provider: Web3ProviderService) {
    super();
  }

  async analyseAsset({ chainId, address }: AssetReference): Promise<AssetAnalysisResult> {
    const web3 = this.web3Provider.getInstanceByChainId(chainId) as Web3;
    const assetContract = new ERC20(address, web3);
    const { name, symbol, decimals } = await assetContract.getContractData();
    return { name, symbol, decimals: Number(decimals) };
  }
}
