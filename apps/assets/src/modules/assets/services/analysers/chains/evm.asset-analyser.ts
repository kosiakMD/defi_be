import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { isZeroAddress } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';

import { ERC20Bytes32Contract } from '../../../../../common/contracts/erc20-bytes32.contract';
import { ERC20Contract } from '../../../../../common/contracts/erc20.contract';
import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { EVMAssetAnalyser } from '../core/evm.asset-analyser';

@Injectable()
export class EVMMetaDataStrategy extends EVMAssetAnalyser {
  constructor(private readonly web3Provider: Web3ProviderService) {
    super();
  }

  async analyseAsset({ chainId, address }: AssetReference): Promise<AssetAnalysisResult> {
    if (isZeroAddress(address)) {
      return;
    }

    const web3 = this.web3Provider.getInstanceByChainId(chainId) as Web3;

    try {
      const erc20 = new ERC20Contract(address, web3);
      const { name, symbol, decimals } = await erc20.getContractData();
      return { name, symbol, decimals: Number(decimals) };
    } catch (e) {
      const erc20Bytes32 = await this.tryGetBytes32Info(address, web3);
      if (erc20Bytes32) {
        return erc20Bytes32;
      }
      throw e;
    }
  }

  private async tryGetBytes32Info(address: string, web3: Web3) {
    try {
      const erc20Bytes32 = new ERC20Bytes32Contract(address, web3);
      const { name, symbol, decimals } = await erc20Bytes32.getContractData();
      return { name, symbol, decimals: Number(decimals) };
    } catch (e) {
      // NOTE: Re may safely return here without log
      return null;
    }
  }
}
