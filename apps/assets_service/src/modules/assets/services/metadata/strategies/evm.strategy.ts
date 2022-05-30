import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';

import { ERC20 } from '../../../../../common/contracts/erc20.contract';

import { AssetMetadata, MetadataStrategy } from './metadata.strategy';

// TODO: Handle native coins
@Injectable()
export class EVMMetaDataStrategy implements MetadataStrategy {
  constructor(private readonly web3Provider: Web3ProviderService) {}

  async getMetadata(address: string, chainId: number): Promise<AssetMetadata> {
    const web3 = this.web3Provider.getInstanceByChainId(chainId) as Web3;
    const assetContract = new ERC20(address, web3);
    const { name, symbol, decimals } = await assetContract.getContractData();
    return { name, symbol, decimals: decimals };
  }
}
