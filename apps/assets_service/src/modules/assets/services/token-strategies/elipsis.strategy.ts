import { ELLIPSIS_LP } from '../../../../common/contracts/ELLIPSIS_LP';
import { MINTER } from '../../../../common/contracts/MINTER';

import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class ElipsisStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<any> {
    const chainProvider = this.metadataService.getInstanceByChainId(asset.chainId);
    const assetContract = new ELLIPSIS_LP(asset.address, chainProvider);
    const minterAddress = await assetContract.minter();
    const minterContract = new MINTER(minterAddress, chainProvider, this.logger);

    return minterContract.getCoinsArray();
  }
}
