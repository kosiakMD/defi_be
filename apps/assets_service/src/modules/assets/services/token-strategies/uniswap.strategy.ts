import { UNIV2LP } from '../../../../common/contracts/UNIV2LP';

import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class UniswapStrategy extends UnderlyingTokenStrategy {
  attemptToLoadUnderlyingTokens(asset: AssetsEntity) {
    const assetContract = new UNIV2LP(
      asset.address,
      this.metadataService.getInstanceByChainId(asset.chainId),
    );

    // TODO: Return metadata. E.g. factory
    return Promise.all([assetContract.token0(), assetContract.token1()]);
  }
}
