import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, QuickswapProtocolEnum } from '@app/common/enum';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { QuickswapService } from '../../quickswap/quickswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class QuickswapProtocol extends BasicProtocol<QuickswapService> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.plg];
  readonly project = ProjectEnum.quickswap;
  readonly name = QuickswapProtocolEnum.quickswap;
  readonly displayName = 'Quickswap';
  readonly features = {
    [ChainAbbrEnum.plg]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly quickswapService: QuickswapService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = quickswapService;
  }
}

export default QuickswapProtocol;
