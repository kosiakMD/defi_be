import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { LiquidityPositionResponse } from '@app/common/dto/liquidity.position.dto';
import { ChainAbbrEnum, ProjectEnum, UniswapProtocolEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { StakingPositionResponse } from '../../interfaces/staking.position.interfaces';
import { PriceService } from '../../price/price.service';
import { UniswapSubgraph } from '../../thegraph/uniswap.subgraph';
import { UniswapService } from '../../uniswap/uniswap.service';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class UniswapProtocolV2 extends BasicProtocol<UniswapService> implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV2;
  readonly label: 'Uniswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly uniswapService: UniswapService,
    private readonly uniswapSubgraph: UniswapSubgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = uniswapService;
  }

  public [FeatureEnum.pools] = (address: Address): Promise<LiquidityPositionResponse> => {
    return this.uniswapSubgraph.getLiquidityPositions([address]);
  };

  public [FeatureEnum.staking] = (address: Address): Promise<StakingPositionResponse> => {
    return this.uniswapSubgraph.getStakingPositions([address]);
  };
}

export default UniswapProtocolV2;
