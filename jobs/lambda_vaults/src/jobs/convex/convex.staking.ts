import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger, ProtocolNameEnum } from '@app/common';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { JobBase } from '../job.base';
import { JobInterface } from '../job.interface';

@Injectable()
export class ConvexStaking extends JobBase<IntegrationStakingPositionDto> implements JobInterface {
  chain = ChainIdEnum.eth;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.Convex;

  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  //   private mapping = [];
  //   protected availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
  ) {
    super();
    this.availableDtosForConversion = new Map<string, string>([
      //
    ]);
  }

  protected async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    //
  }

  updateWithChainData(): Promise<IntegrationStakingPositionDto[]> {
    //
  }
}
