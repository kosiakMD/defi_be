import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { ChainAbbrEnum, ProjectEnum, SushiSwapProtocolEnum } from '../../../common/enum';

import { AccountService } from '../../../account/account.service';
import { PriceService } from '../../../price/price.service';
import { SushiswapSubgraph } from '../../../thegraph/sushiswap.subgraph';
import { FeatureEnum } from '../../features/features.enum';
import AbstractProtocol from '../abstractProtocol';
import { Mapper } from '../mappers/mapper';
import UniswapLikeProtocol from './uniswapLikeProtocol';

@Injectable()
export class SushiswapProtocolV2 extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.sushiswap;
  readonly name = SushiSwapProtocolEnum.sushiswapV2;
  readonly displayName = 'Sushiswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: SushiswapSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();
  }
}

export default SushiswapProtocolV2;
