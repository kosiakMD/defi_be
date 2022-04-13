import { CompoundToken } from '@app/common/web3provider/contracts/protocols/compound/CompoundToken';

import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class CompoundStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<any> {
    const contract = new CompoundToken(asset.address);
    // TODO: A little risky :)
    const tokenAddress = await this.multicall.call(contract.underlying(), asset.chainId);
    return [tokenAddress];
  }
}
