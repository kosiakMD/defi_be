import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, UniswapProtocolEnum } from '@app/common/enum';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { UniswapSubgraph } from '../../../subgraphs/subgraphs/uniswap.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import AbstractProtocol from '../abstractProtocol';
import UniswapLikeProtocol from './uniswapLikeProtocol';

@Injectable()
export class UniswapProtocolV2 extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV2;
  readonly displayName = 'Uniswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    protected readonly subgraph: UniswapSubgraph,
  ) {
    super();
  }
}

export default UniswapProtocolV2;
