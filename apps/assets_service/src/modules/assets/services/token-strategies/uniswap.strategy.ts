import { UNIV2LP } from '../../../../common/contracts/univ2-lp.contract';

import { AssetEntity } from '../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class UniswapStrategy extends UnderlyingTokenStrategy {
  attemptToLoadUnderlyingTokens(asset: AssetEntity) {
    const assetContract = new UNIV2LP(
      asset.address,
      this.metadataService.getInstanceByChainId(asset.chainId),
    );

    // TODO: Return metadata. E.g. factory
    return Promise.all([assetContract.token0(), assetContract.token1()]);
  }
}
