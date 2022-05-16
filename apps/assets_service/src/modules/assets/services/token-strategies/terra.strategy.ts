import { PoolAssetsQueryResp } from '@app/common';

import { AssetEntity } from '../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class TerraStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetEntity) {
    const chainProvider = this.metadataService.getInstanceByChainId(asset.chainId);
    const { minter } = await chainProvider.wasm.contractQuery(asset.address, { minter: {} });
    const underlyingInfo: PoolAssetsQueryResp = await chainProvider.wasm.contractQuery(minter, {
      pool: {},
    });
    return underlyingInfo.assets.map((asset) =>
      asset.info.token ? asset.info.token.contract_addr : asset.info.native_token.denom,
    );
  }
}
