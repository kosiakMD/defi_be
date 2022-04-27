import { TokenVault } from '@app/common/web3provider/contracts/protocols/yearn/TokenVault';

import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class YearnStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity) {
    const contract = new TokenVault(asset.address);
    // TODO: This is very not specific handler
    // try to find out how to detect LP token
    // discuss with Perto
    const tokenAddress = await this.multicall.call(contract.token(), asset.chainId);
    return [tokenAddress];
  }
}
