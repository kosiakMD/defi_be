// TODO: Why do we impret this from account service?!?
import { MinimalStakedTokenCheck } from '../../../../../../account_service/src/modules/assets/contracts/MinimalStakedTokenCheck';
import { AssetEntity } from '../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class StakedSushiStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<any> {
    const contract = new MinimalStakedTokenCheck(asset.address);
    const tokenAddress = await this.multicall.call(contract.sushi(), asset.chainId);
    return [tokenAddress];
  }
}
