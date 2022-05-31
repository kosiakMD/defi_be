import { Injectable } from '@nestjs/common';

import { ZERO_ADDRESS } from '@app/common/constant';
import { AToken } from '@app/common/web3provider/contracts/protocols/aave/a-token';
import { VariableDebtToken } from '@app/common/web3provider/contracts/protocols/aave/variable-debt-token';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class AaveStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly multicall: MulticallAggregator) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    try {
      const contract = new VariableDebtToken(asset.address);
      const tokenAddress = await this.multicall.call(
        contract.UNDERLYING_ASSET_ADDRESS(),
        asset.chainId,
      );
      return [tokenAddress];
    } catch {
      //
    }

    const contract = new AToken(asset.address);
    const tokenAddress = await this.multicall.call(
      contract.underlyingAssetAddress(),
      asset.chainId,
    );
    return [
      tokenAddress
        .toLowerCase()
        .replace(/^0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee$/, ZERO_ADDRESS),
    ];
  }
}
