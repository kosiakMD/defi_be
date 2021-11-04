import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Logger,
  IntegrationFeaturesDataDto,
  FeatureResultDto,
  LendingPositionDto,
  LendingErcToken,
  AaveUserReserve,
  AaveUser,
  AaveProtocolEnum,
  TraderjoeProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  Address,
  ChainDto,
} from '@app/common';
import { WETH_ADDRESS } from '@app/common/constant';
import { decimalConverter } from '@app/common/utils/number';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { AaveSubgraph } from '../../thegraph/aave.subgraph';
import { FeatureEnum } from '../features/features.enum';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class TraderJoeProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.traderjoe;
  readonly displayName = 'Trader Joe';
  readonly name = TraderjoeProtocolEnum.traderjoe;
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.lending, FeatureEnum.borrowing, FeatureEnum.pools, FeatureEnum.staking, FeatureEnum.farming],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = this;
  }

}
export default TraderJoeProtocol;