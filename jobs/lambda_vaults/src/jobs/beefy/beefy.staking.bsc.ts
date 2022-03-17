import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { JobInterface } from '../job.interface';
import { DbMapping } from '../utils/dbmapping';
import { BeefyApiService } from './beefy.api.service';
import { BeefyStakingBase } from './beefy.staking.base';

@Injectable()
export class BeefyStakingBsc extends BeefyStakingBase implements JobInterface {
  chain = ChainIdEnum.bnb;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected mapping = [];
  protected dbMapping: DbMapping;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly settingsService: SettingsService,
    protected readonly priceService: PriceService,
    protected readonly api: BeefyApiService,
  ) {
    super();
    this.dbMapping = new DbMapping(storeService);
  }
}
