import { Injectable } from '@nestjs/common';

import { TokenVault } from '@app/common/web3provider/contracts/protocols/yearn/TokenVault';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class YearnStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly multicall: MulticallAggregator) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const contract = new TokenVault(asset.address);
    // TODO: This is very not specific handler
    // try to find out how to detect LP token
    // discuss with Petro
    const tokenAddress = await this.multicall.call(contract.token(), asset.chainId);
    return [tokenAddress];
  }
}
