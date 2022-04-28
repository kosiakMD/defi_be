import { MinimalStakedTokenCheck } from '../../../../../../account_service/src/modules/assets/contracts/MinimalStakedTokenCheck';
import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class StakedSOHMStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<any> {
    const contract = new MinimalStakedTokenCheck(asset.address);
    try {
      const tokenAddress = await this.multicall.call(contract.sOHM(), asset.chainId);
      return [tokenAddress];
    } catch (error) {
      this.logger.debug(`Error to get StakedSOHMStrategy underlying tokens ${error.message}`);
    }
    return [];
  }
}
