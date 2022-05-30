import { Injectable } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';

import { UNIV2LP } from '../../../../../common/contracts/univ2-lp.contract';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class UniswapStrategy implements UnderlyingTokenStrategy {
  constructor(private readonly web3Provider: Web3ProviderService) {}

  attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const assetContract = new UNIV2LP(
      asset.address,
      this.web3Provider.getInstanceByChainId(asset.chainId),
    );

    // TODO: Return metadata. E.g. factory
    return Promise.all([assetContract.token0(), assetContract.token1()]);
  }
}
