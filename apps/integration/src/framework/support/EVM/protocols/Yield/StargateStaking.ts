import { StargateAssetService } from 'apps/integration/src/modules/microservices/stargate.asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { ISupplyTokenOpportunity } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MasterChef } from './MasterChef';

export class StargateStaking extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: StargateAssetService,
  ) {
    super(abiService, multicall, logger, cache);
  }

  functionPredicates: INamedFunctionPredicates = {
    totalStaked: () => (item) => item.name === 'lpBalances',
    poolInfo: () => (item) => item.name === 'poolInfo',
    pendingRewards: () => (item) => item.name === 'pendingStargate',
    poolLength: () => (item) => item.name === 'poolLength',
    rewardPerSecond: () => (item) => item.name === 'stargatePerBlock',
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());

    const poolInfos = await this.fetchPoolInfos(poolIds);

    const totalLiquidityCalls = [];
    poolInfos.forEach((poolInfo) => {
      const lp = new ERC20(poolInfo.stakedToken);
      totalLiquidityCalls.push(lp.totalSupply());
    });

    const totalStakedPerPool = await this.multicall.callArray(totalLiquidityCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatStakingOpportunityMinimal(
        poolInfo,
        totalStakedPerPool[poolIdx].toString(),
        context,
      );
    });
  }

  protected modifyUserEntrySupplied(supplied: ISupplyTokenOpportunity, balance: number) {
    const amount = (supplied.token.underlying[0].balance = balance);
    const value = (supplied.token.underlying[0].value = balance * supplied.token.price);
    return Object.assign(supplied, {
      amount,
      value,
    });
  }
}
