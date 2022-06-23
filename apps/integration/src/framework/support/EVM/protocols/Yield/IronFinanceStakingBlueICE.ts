import { IronFinanceAssetService } from 'apps/integration/src/modules/microservices/ironFinance.asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureOpportunity } from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { IronFinanceStaking } from './IronFinanceStaking';

export class IronFinanceStakingICE extends IronFinanceStaking {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: IronFinanceAssetService,
  ) {
    super(abiService, multicall, logger, cache, assetService);
  }

  functionPredicates: INamedFunctionPredicates = {
    lpToken: () => (item) => item.name === 'blueICE',
    pendingRewards: () => (item) => item.name === 'pendingReward',
    rewardToken: () => (item) => item.name === 'usdc',
    userInfo: () => (item) => item.name === 'userInfo',
    rewardPerSecond: () => (item) => item.name === 'rewardPerSecond',
    accRewardPerShare: () => (item) => item.name === 'accRewardPerShare',
  };

  protected async getUserInfoAndRewardsFromChain(
    pools: IStakingFeatureOpportunity[],
    address: string,
  ): Promise<Map<string, CallData<any>>> {
    const contract = this.getMainContract();

    const calls = new Map();
    pools.forEach((pool) => {
      const [masterchef, poolId] = pool.id.split('::');

      calls.set(
        this.userInfoLabel(masterchef, poolId, address),
        contract.createCall(this.functions.userInfo, address),
      );
      calls.set(
        this.pendingRewardsLabel(masterchef, poolId, address),
        contract.createCall(this.functions.pendingRewards, address),
      );
    });

    return await this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected async getPoolsList(context?: { [key: string]: any }) {
    return [
      {
        stakedToken: context.lpToken,
      },
    ];
  }
}
