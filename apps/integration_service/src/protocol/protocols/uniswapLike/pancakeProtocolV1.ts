import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../account/account.service';
import { Mapper } from '../../../mappers/mapper';
import { PriceService } from '../../../price/price.service';
import { PancakeSubgraph } from '../../../thegraph/pancake.subgraph';
import { FeatureEnum } from '../../features/features.enum';
import AbstractProtocol from '../abstractProtocol';
import UniswapLikeProtocol from './uniswapLikeProtocol';

@Injectable()
export default class PancakeProtocolV1 extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV1;
  readonly displayName = 'Pancake';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
  };
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly dataProvider: PancakeSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();
  }
}
