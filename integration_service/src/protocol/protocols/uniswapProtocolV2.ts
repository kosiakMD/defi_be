import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ProjectEnum, UniswapProtocolEnum } from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { Mapper } from '../../mappers/mapper';
import { PriceService } from '../../price/price.service';
import { UniswapSubgraph } from '../../thegraph/uniswap.subgraph';
// import { UniswapService } from '../../uniswap/uniswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class UniswapProtocolV2 extends BasicProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV2;
  readonly displayName = 'Uniswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.transactions],
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  // protected readonly dataProvider;
  protected feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    // private readonly uniswapService: UniswapService,
    // private readonly uniswapService: UniswapService,
    private readonly uniswapSubgraph: UniswapSubgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
  ) {
    super();
    this.dataProvider = uniswapSubgraph; // uniswapService
  }
}

export default UniswapProtocolV2;
