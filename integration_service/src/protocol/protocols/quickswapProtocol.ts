import { AccountService } from 'src/account/account.service';
import { PriceService } from 'src/price/price.service';
import { QuickswapService } from 'src/quickswap/quickswap.service';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ProjectEnum, QuickswapProtocolEnum } from 'src/common/enum';

import { Logger } from '../../Logger/Logger.service';
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
    [ChainAbbrEnum.plg]: [FeatureEnum.pools],
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
