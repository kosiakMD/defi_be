import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { FeatureEnum } from '@app/common';
import { ChainAbbrEnum, PangolinProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PangolinSubgraph } from '../../../thegraph/pangolin.subgraph';
import AbstractProtocol from '../abstractProtocol';
import { Mapper } from '../mappers/mapper';
import UniswapLikeProtocol from './uniswapLikeProtocol';

@Injectable()
export class PangolinProtocol extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.pangolin;
  readonly name = PangolinProtocolEnum.pangolin;
  readonly displayName = 'Pangolin';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PangolinSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();
  }
}

export default PangolinProtocol;
