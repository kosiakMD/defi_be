import { MinimalStakedTokenCheck } from '../../../../../../account_service/src/modules/assets/contracts/MinimalStakedTokenCheck';
import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class StakedStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<any> {
    // TODO: Split into two different categories
    const contract = new MinimalStakedTokenCheck(asset.address);
    try {
      const tokenAddress = await this.multicall.call(contract.sushi(), asset.chainId);
      return [tokenAddress];
    } catch (e) {
      //
    }
    try {
      const tokenAddress = await this.multicall.call(contract.sOHM(), asset.chainId);
      return [tokenAddress];
    } catch {
      //
    }
  }
}
