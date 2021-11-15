import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, EllipsisProtocolEnum, FeatureEnum, Logger, ProjectEnum } from '@app/common';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

export class EllipsisProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly displayName = 'Ellipsis';
  readonly project = ProjectEnum.ellipsis;
  readonly name = EllipsisProtocolEnum.ellipsis;
  readonly features = { [ChainAbbrEnum.bsc]: [FeatureEnum.pools, FeatureEnum.staking] };

  protected readonly dataProvider;

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
export default EllipsisProtocol;
