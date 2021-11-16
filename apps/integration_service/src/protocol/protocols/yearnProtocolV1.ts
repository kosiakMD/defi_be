import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, FeatureEnum, Logger, YearnProtocolEnum } from '@app/common';

import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import { PriceService } from '../../price/price.service';
import { YearnV1Subgraph } from './yearn/services/yearn.v1.subgraph';
import { YearnProtocolBase } from './yearn/yearnProtocolBase';

@Injectable()
export default class YearnProtocolV1 extends YearnProtocolBase {
  readonly chains = [ChainAbbrEnum.eth];
  readonly displayName = 'YearnV1';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
  };
  readonly name = YearnProtocolEnum.YearnV1;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly yearnSubgraph: YearnV1Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3Provider,
  ) {
    super();
  }
}
