import { Injectable } from '@nestjs/common';

import { CompoundToken } from '@app/common/web3provider/contracts/protocols/compound/CompoundToken';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class CompoundStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly multicall: MulticallAggregator) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const contract = new CompoundToken(asset.address);
    // TODO: A little risky :)
    const tokenAddress = await this.multicall.call(contract.underlying(), asset.chainId);
    return [tokenAddress];
  }
}
