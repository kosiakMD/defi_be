import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { FeatureEnum } from '@app/common';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../account/account.service';
import { PriceService } from '../../../price/price.service';
import DataProviderProtocol from '../dataProviderProtocol';
import { PancakeV2Service } from './pancake.v2.service';

@Injectable()
export default class PancakeProtocolV2 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV2;
  readonly displayName = 'Pancake';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected pancakeService: PancakeV2Service,
  ) {
    super();

    this.dataProvider = pancakeService;
  }
}
