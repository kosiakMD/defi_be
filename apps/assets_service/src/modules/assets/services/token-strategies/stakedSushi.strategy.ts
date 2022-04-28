import { MinimalStakedTokenCheck } from '../../../../../../account_service/src/modules/assets/contracts/MinimalStakedTokenCheck';
import { AssetsEntity } from '../../entities/assets.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class StakedSushiStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetsEntity): Promise<any> {
    const contract = new MinimalStakedTokenCheck(asset.address);
    try {
      const tokenAddress = await this.multicall.call(contract.sushi(), asset.chainId);
      return [tokenAddress];
    } catch (error) {
      this.logger.debug(`Error to get StakedSushiStrategy underlying tokens ${error.message}`);
    }
  }
}
