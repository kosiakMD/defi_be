import { ZERO_ADDRESS } from '@app/common/constant';
import { AToken } from '@app/common/web3provider/contracts/protocols/aave/AToken';
import { VariableDebtToken } from '@app/common/web3provider/contracts/protocols/aave/VariableDebtToken';

import { AssetEntity } from '../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

export class AaveStrategy extends UnderlyingTokenStrategy {
  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<any> {
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
