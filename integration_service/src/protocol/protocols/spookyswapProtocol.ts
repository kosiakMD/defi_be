import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { ChainAbbrEnum, ProjectEnum, SpookySwapProtocolEnum } from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { SpookyswapService } from '../../spookyswap/spookyswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class SpookySwapProtocol
  extends BasicProtocol<SpookyswapService>
  implements AbstractProtocol
{
  readonly chains = [ChainAbbrEnum.ftm];
  readonly project = ProjectEnum.spookyswap;
  readonly name = SpookySwapProtocolEnum.SpookySwap;
  readonly label = 'SpookySwap';
  readonly features = {
    [ChainAbbrEnum.ftm]: [FeatureEnum.pools],
  };
  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly spookyswapService: SpookyswapService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = spookyswapService;
  }
}
export default SpookySwapProtocol;
