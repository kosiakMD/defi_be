import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { ChainIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { toLiquidityPoolFeature } from '../../utils/conventer';
import { getJobPlaceholder } from '../../utils/string';
import { isTimeToDo } from '../../utils/time';
import { IntegrationJobsRepository } from '../integration.jobs.repository';
import { LiquidityPoolFeature } from '../integrations.dto';
import { LiquidityPoolJobAbstract } from '../liquidity.pool.job.abstract';
import { SPOOKYSWAP_POOLS } from './pools';

@Injectable()
export class SpookyswapPoolJob extends LiquidityPoolJobAbstract {
  public chain = ChainIdEnum.ftm;
  public protocol = 'SpookySwap'; // must be Enum!
  public feature = 'pools'; // must be Enum!
  public placeholder = getJobPlaceholder(this.chain, this.feature, this.protocol);

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly integrationJobsRepository: IntegrationJobsRepository,
  ) {
    super();
  }

  async updateTrackedLiquidityPools(): Promise<LiquidityPoolFeature[]> {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    const isNecessaryToUpdate = isTimeToDo(
      this.configuration.updatedAt,
      this.configuration.updateFrequency,
    );
    if (!isNecessaryToUpdate) {
      return this.getTrackedLiquidityPools();
    }
    this.logger.log(`it is time update pools!`, this.placeholder);

    // todo: get list of pools from the subgraph based on TVL
    const poolsListSet: Set<string> = new Set<string>();
    SPOOKYSWAP_POOLS.map((p) => poolsListSet.add(p));

    const liquidityPoolFeaturesToBeAdded: LiquidityPoolFeature[] = [];
    this.getTrackedLiquidityPools().map((tp) => {
      poolsListSet.delete(tp.lpToken.address);
    });
    this.logger.log(`got [${poolsListSet.size}] token infos to add`, this.placeholder);

    // collect lp tokens data from account service
    for (const pa of poolsListSet.keys()) {
      const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
        await this.accountService.saveTrackingAsset(pa, this.chain);

      if (trackedLiquidityPoolTokenData.isLp) {
        liquidityPoolFeaturesToBeAdded.push(toLiquidityPoolFeature(trackedLiquidityPoolTokenData));
      }
    }

    this.logger.log(
      `extracted [${liquidityPoolFeaturesToBeAdded.length}] liquidity pool tokens to add`,
      this.placeholder,
    );

    this.configuration.settings = [
      ...this.configuration.settings,
      ...liquidityPoolFeaturesToBeAdded,
    ] as LiquidityPoolFeature[];

    this.configuration = await this.integrationJobsRepository.updateJob(this.configuration);
    return this.getTrackedLiquidityPools();
  }
}
