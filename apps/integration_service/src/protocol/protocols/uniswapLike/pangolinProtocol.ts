import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ChainAbbrEnum, PangolinProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../account/account.service';
import { PangolinService } from '../../../pangolin/pangolin.service';
import { PriceService } from '../../../price/price.service';
import { FeatureEnum } from '../../features/features.enum';
import AbstractProtocol from '../abstractProtocol';
import UniswapLikeProtocol from './uniswapLikeProtocol';

@Injectable()
export class PangolinProtocol extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.pangolin;
  readonly name = PangolinProtocolEnum.pangolin;
  readonly displayName = 'Pangolin';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly pangolinService: PangolinService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();

    this.dataProvider = pangolinService;
  }
}

export default PangolinProtocol;
