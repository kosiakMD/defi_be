import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { Web3ProviderService } from '@app/common/web3provider';

import { EllipsisLpContact } from '../../../../../common/contracts/ellipsis-lp.contract';
import { MinterContract } from '../../../../../common/contracts/minter.contract';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class ElipsisStrategy implements UnderlyingTokenStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3ProviderService,
  ) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    const chainProvider = this.web3Provider.getInstanceByChainId(asset.chainId);
    const assetContract = new EllipsisLpContact(asset.address, chainProvider);
    const minterAddress = await assetContract.minter();
    const minterContract = new MinterContract(minterAddress, chainProvider, this.logger);

    return minterContract.getCoinsArray();
  }
}
