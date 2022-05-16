import { ELLIPSIS_LP } from '../../../../common/contracts/ellipsys-lp.contract';
import { MINTER } from '../../../../common/contracts/minter.contract';

import { AssetEntity } from '../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class ElipsisStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<any> {
    const chainProvider = this.metadataService.getInstanceByChainId(asset.chainId);
    const assetContract = new ELLIPSIS_LP(asset.address, chainProvider);
    const minterAddress = await assetContract.minter();
    const minterContract = new MINTER(minterAddress, chainProvider, this.logger);

    return minterContract.getCoinsArray();
  }
}
