import { Injectable } from '@nestjs/common';

import { PoolAssetsQueryResp } from '@app/common';
import { Web3ProviderService } from '@app/common/web3provider';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class TerraStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly web3Provider: Web3ProviderService) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const chainProvider = this.web3Provider.getInstanceByChainId(asset.chainId);
    const { minter } = await chainProvider.wasm.contractQuery(asset.address, { minter: {} });
    const underlyingInfo: PoolAssetsQueryResp = await chainProvider.wasm.contractQuery(minter, {
      pool: {},
    });
    return underlyingInfo.assets.map((asset) =>
      asset.info.token ? asset.info.token.contract_addr : asset.info.native_token.denom,
    );
  }
}
