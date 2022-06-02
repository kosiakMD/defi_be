import { Injectable } from '@nestjs/common';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

// TODO: Why do we import this from account service?!?
import { MinimalStakedTokenCheck } from '../../../../../../../account/src/modules/assets/contracts/MinimalStakedTokenCheck';
import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class StakedSOHMStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly multicall: MulticallAggregator) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const contract = new MinimalStakedTokenCheck(asset.address);
    const tokenAddress = await this.multicall.call(contract.sOHM(), asset.chainId);
    return [tokenAddress];
  }
}
