import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { MasterchiefPoolInfoResponse } from '../../chain/dto/token';
import { MultiCallInternal } from '../../chain/multicall';
import { Web3Provider } from '../../chain/web3.provider';
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

@Injectable()
export class PancakeswapPoolJob extends LiquidityPoolJobAbstract {
  public chain = ChainIdEnum.bsc;
  public protocol = 'PancakeV2';
  public feature = 'pools';
  public placeholder = getJobPlaceholder(this.chain, this.feature, this.protocol);

  private masterchiefAddress = '0x73feaa1ee314f8c655e354234017be2193c9e24e';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly web3Provider: Web3Provider,
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

    const multicall = new MultiCallInternal(this.web3Provider.getInstanceByChainId(this.chain));

    const poolsInfo: Map<string, MasterchiefPoolInfoResponse> = await multicall.getPoolsInfo(
      this.masterchiefAddress,
    );

    this.logger.log(
      `got [${poolsInfo.size}] pools from [${this.masterchiefAddress}] contract, [${
        this.getTrackedLiquidityPools().length
      }] pools existed`,
      this.placeholder,
    );

    // exclude existed in configuration pools:
    this.getTrackedLiquidityPools().forEach((tp) => {
      poolsInfo.delete(tp.lpToken.address);
    });
    this.logger.log(`got [${poolsInfo.size}] token infos to add`, this.placeholder);

    const liquidityPoolFeaturesToBeAdded: LiquidityPoolFeature[] = [];
    for (const address of poolsInfo.keys()) {
      try {
        const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
          await this.accountService.saveTrackingAsset(address, this.chain);
        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPoolFeaturesToBeAdded.push(
            toLiquidityPoolFeature(trackedLiquidityPoolTokenData),
          );
        }
      } catch (e) {
        this.logger.error(
          `error to get token data to account service, chain [${this.chain}], address [${address}]`,
          this.placeholder,
        );
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
