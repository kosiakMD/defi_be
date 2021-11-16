import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MasterchiefPoolInfoResponse, TokenBalance } from '../../chain/dto/token';
import { MultiCallInternal } from '../../chain/multicall';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { BNToDecimals } from '../../utils/calc';
import { getJobPlaceholder } from '../../utils/string';
import { isTimeToDo } from '../../utils/time';
import { IntegrationJob } from '../dto/db.dto';
import { FeaturesExtracted } from '../features.extracted';
import { IntegrationJobsRepository } from '../integration.jobs.repository';
import {
  LiquidityPoolFeature,
  PoolTokenDto,
  PriceTokenDto,
  StakingPoolFeature,
} from '../integrations.dto';
import { StakingJobInterface } from '../staking.job.interface';

@Injectable()
export class PancakeswapStakingJob implements StakingJobInterface {
  public chain = ChainIdEnum.bsc;
  public protocol = 'PancakeV2';
  public feature = 'staking';
  public placeholder = getJobPlaceholder(this.chain, this.feature, this.protocol);

  private configuration: IntegrationJob;
  private isConfigurationSet = false;

  private masterchiefAddress = '0x73feaa1ee314f8c655e354234017be2193c9e24e';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3Provider,
    private readonly accountService: AccountService,
    private readonly integrationJobsRepository: IntegrationJobsRepository,
    private readonly featuresExtracted: FeaturesExtracted,
  ) {}

  setConfiguration(config: IntegrationJob): void {
    if (this.isConfigurationSet) {
      throw new Error(`configuration is already set for [${this.placeholder}]`);
    }
    this.configuration = config;
    this.isConfigurationSet = true;
  }

  isEnabled(): boolean {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    return this.configuration ? this.configuration.isEnabled : false;
  }

  getTrackedStakingPools(): StakingPoolFeature[] {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    return this.configuration.settings as StakingPoolFeature[];
  }

  async updateTrackedStakingPools(): Promise<any> {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    const isNecessaryToUpdate = isTimeToDo(
      this.configuration.updatedAt,
      this.configuration.updateFrequency,
    );
    if (!isNecessaryToUpdate) {
      return this.getTrackedStakingPools();
    }
    this.logger.log(`it is time update pools!`, this.placeholder);

    const multicall = new MultiCallInternal(this.web3Provider.web3(this.chain));

    const poolsInfo: Map<string, MasterchiefPoolInfoResponse> = await multicall.getPoolsInfo(
      this.masterchiefAddress,
    );

    const cake = await multicall.getCake(this.masterchiefAddress);
    const rewardToken = plainToClass(
      PriceTokenDto,
      await this.accountService.saveTrackingAsset(cake, this.chain),
      {
        excludeExtraneousValues: true,
      },
    );

    const stakingPoolFeaturesToBeAdded: StakingPoolFeature[] = [];

    for (const address of poolsInfo.keys()) {
      try {
        const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          address,
          this.chain,
        );

        const stakingToken: PriceTokenDto = plainToClass(PriceTokenDto, poolTokenData, {
          excludeExtraneousValues: true,
        });

        const stakingPoolFeature: StakingPoolFeature = {
          address: this.masterchiefAddress,
          poolId: poolsInfo.get(address).id,
          poolName: null,
          rewardToken: rewardToken,
          stakingToken: stakingToken,
        };
        if (poolTokenData.isLp) {
          stakingPoolFeature.liquidityPoolTokens = plainToClass(
            PoolTokenDto,
            poolTokenData.underlyingAssets,
            {
              excludeExtraneousValues: true,
            },
          );
        }
        stakingPoolFeaturesToBeAdded.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error to get token data from account service, chain [${this.chain}], address [${address}]`,
          this.placeholder,
        );
      }
    }

    this.logger.log(
      `extracted [${stakingPoolFeaturesToBeAdded.length}] staking pools to update`,
      this.placeholder,
    );

    this.configuration.settings = stakingPoolFeaturesToBeAdded;
    await this.integrationJobsRepository.updateJob(this.configuration);
    return this.getTrackedStakingPools();
  }

  async updateWithExternalData(): Promise<StakingPoolFeature[]> {
    const multicall = new MultiCallInternal(this.web3Provider.web3(this.chain));
    const balancesData: Map<number, TokenBalance> = new Map<number, TokenBalance>();
    this.configuration.settings.map((s) => {
      balancesData.set(s.poolId, {
        tokenContract: s.stakingToken.address,
        userAddress: s.address,
        balance: null,
      });
    });
    const balances: Map<number, TokenBalance> = await multicall.getChiefBalances(balancesData);
    const pairs: Map<string, LiquidityPoolFeature> = this.featuresExtracted
      .getPoolFeatures()
      .get(this.chain);

    this.configuration.settings.forEach((s) => {
      s = s as StakingPoolFeature;
      s.stakingToken.balance = BNToDecimals(
        balances.get(s.poolId).balance,
        s.stakingToken.decimals,
      ).toString();
      if (s.liquidityPoolTokens) {
        const liquidityPair = pairs.get(s.stakingToken.address);
        s.stakingToken.totalSupply = liquidityPair.lpToken.totalSupply;
        s.liquidityPoolTokens.forEach((lpt) => {
          const poolToken =
            liquidityPair.tokens[0].positionInPool === lpt.positionInPool
              ? liquidityPair.tokens[0]
              : liquidityPair.tokens[1];
          lpt.reserve = poolToken.reserve;
        });
      }
    });
    return this.configuration.settings as StakingPoolFeature[];
  }
}
