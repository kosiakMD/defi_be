import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep, startsWith } from 'lodash';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { CvxRewardPool } from '@app/common/web3provider/contracts/protocols/convex/CvxRewardPool';
import { Rewarder } from '@app/common/web3provider/contracts/protocols/sushiswap/Rewarder';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UniswapV2AssetService } from '../../../../../modules/microservices/uniswap.asset.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureUserEntry } from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { IMasterChefMeta, IMasterChefPoolInfo, MasterChef } from './MasterChef';

export interface ISushiEthMasterChefMeta extends IMasterChefMeta {
  context?: {
    rewardersAbisMap?: Map<string, AbiItem[]>;
    badPools?: number[];
    rewardToken?: string;
  };
}

type ISushiRewardTokenOpportunity = IRewardTokenOpportunity<{ rewarder: Address }>;
type ISushiRewardTokenMinimal = IRewardTokenMinimal<{ rewarder: Address }>;

type ISushiSwapStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  ISushiRewardTokenOpportunity[],
  void,
  any
>;

export type ISushiSwapStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  ISushiRewardTokenMinimal[],
  void,
  any
>;

export class MasterChefV2 extends MasterChef<
  ISushiSwapStakingFeatureMinimal,
  ISushiSwapStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  ISushiEthMasterChefMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
  ) {
    super(abiService, multicall, logger, cache, assetService);
  }

  functionPredicates: INamedFunctionPredicates = {
    lpToken: () => (item) => item.name === 'lpToken',
    poolInfo: () => (item) => item.name === 'poolInfo',
    pendingRewards: () => (item) => item.name === 'pendingSushi',
    poolLength: () => (item) => item.name === 'poolLength',
    rewardPerSecond: () => (item) => startsWith(item.name, 'sushiPer'),
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
    rewardToken: () => (item) => item.name === 'SUSHI',
    rewarder: () => (item) => item.name === 'rewarder',
  };

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const multicallResp = await this.multicall.handleInBatches(
      poolIds.reduce((resp, poolId) => {
        resp.set(`${poolId}.lp`, contract.createCall(this.functions.lpToken, poolId));
        resp.set(`${poolId}.info`, contract.createCall(this.functions.poolInfo, poolId));
        resp.set(`${poolId}.rewarder`, contract.createCall(this.functions.rewarder, poolId));
        return resp;
      }, new Map()),
      this.meta.chain,
    );

    const rewarders = [];
    const formattedPoolsInfo = this.formatPoolInfo(
      poolIds.map((idx) => {
        rewarders.push(multicallResp.get(`${idx}.rewarder`).output.data);
        return {
          ...multicallResp.get(`${idx}.info`).output.data,
          poolId: idx,
          stakedToken: multicallResp.get(`${idx}.lp`).output.data.toLowerCase(),
        };
      }),
    );

    this.meta.context.rewardersAbisMap = await this.getRewardersAbi(rewarders);

    const rewardersDataCalls = new Map();
    rewarders.forEach((rewarder, index) => {
      if (rewarder === ZERO_ADDRESS) return;
      const abi = this.meta.context.rewardersAbisMap.get(rewarder);
      const tokenPerBlock = abi.find((item) => item.name === 'tokenPerBlock');
      const rewardPerSecond = abi.find((item) => item.name === 'rewardPerSecond');
      const rewardRate = abi.find((item) => item.name === 'rewardRate');
      const pendingTokens = abi.find((item) => item.name === 'pendingTokens');

      const rewarderContract = new DynamicContract(rewarder);
      rewardersDataCalls.set(
        `${index}.reward`,
        rewarderContract.createCall(pendingTokens, 0, ZERO_ADDRESS, 0),
      );

      rewardersDataCalls.set(
        `${index}.rewardPerSecond`,
        rewarderContract.createCall(tokenPerBlock || rewardPerSecond || rewardRate),
      );
    });

    const rewarderResp = await this.multicall.handleInBatches(rewardersDataCalls, this.meta.chain);

    return formattedPoolsInfo.map((poolInfo, index) => {
      const additionalReward =
        rewarderResp.get(`${index}.reward`)?.output.data['0'][0]?.toLowerCase() || ZERO_ADDRESS;
      const additionalRewardPerSecond =
        rewarderResp.get(`${index}.rewardPerSecond`)?.output.data || 0;

      return {
        ...poolInfo,
        additionalReward,
        additionalRewardPerSecond,
        rewarder: rewarders[index],
      };
    });
  }

  private async getRewardersAbi(rewarders: string[]) {
    const rewardersSet = new Set(rewarders.filter((rewarder) => rewarder !== ZERO_ADDRESS));

    const rewardersAbisMap = new Map();
    await Promise.all(
      Array.from(rewardersSet).map(async (rewarder) => {
        rewardersAbisMap.set(rewarder, await this.abiService.fetchAbi(rewarder, this.meta.chain));
      }),
    );
    return rewardersAbisMap;
  }

  protected async fetchUserData(
    address: Address,
    pools: ISushiSwapStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();
    const calls = new Map();

    pools.forEach((pool) => {
      const [masterchef, poolId] = pool.id.split('::');

      calls.set(
        this.userInfoLabel(masterchef, poolId, address),
        contract.createCall(this.functions.userInfo, poolId, address),
      );

      calls.set(
        this.pendingRewardsLabel(masterchef, poolId, address),
        contract.createCall(this.functions.pendingRewards, poolId, address),
      );

      if (pool.rewarded.length === 2) {
        const rewarder = pool.rewarded[1].extra.rewarder;
        if (rewarder !== ZERO_ADDRESS) {
          const rewarderContract = new DynamicContract(rewarder);
          if (this.meta.chain === ChainIdEnum.eth && rewarder.toLowerCase() === convexRewarder) {
            calls.set(
              `${pool.id}.${address}.reward`,
              rewarderContract.createCall(CvxRewardPool.earned, address),
            );
            return;
          }

          calls.set(
            `${pool.id}.${address}.reward`,
            rewarderContract.createCall(Rewarder.pendingToken, poolId, address),
          );
        }
      }
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(
    address: string,
    pool: ISushiSwapStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const [masterchef, poolId] = pool.id.split('::');

    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    const balance = normalizeDecimals(
      userInfo[this.getUserInfoAmountKey()].toString(),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;

    const clonePool = cloneDeep(pool);

    clonePool.supplied[0] = this.modifyUserEntrySupplied(clonePool.supplied[0], balance);

    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(masterchef, poolId, address));

    const additionalReward =
      data.get(`${clonePool.id}.${address}.reward`)?.output.data?.pending ||
      data.get(`${clonePool.id}.${address}.reward`)?.output.data;
    const rewards = [pendingRewards];
    if (additionalReward) rewards.push(additionalReward);

    const rewardBalances = rewards.map((rewardBal, index) =>
      normalizeDecimals(rewardBal.toString(), clonePool.rewarded[index].token.decimals),
    );

    clonePool.rewarded.map((reward, index) => {
      Object.assign(reward, {
        amount: rewardBalances[index],
        value: rewardBalances[index] * reward.token.price,
      });
    });
    return clonePool as IStakingFeatureUserEntry;
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IMasterChefPoolInfo & { additionalRewardPerSecond; additionalReward; rewarder },
    totalStaked: string,
    context: { [key: string]: any },
  ): ISushiSwapStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(context.rewardPerSecond) //
      .times(rewardShare)
      .toString();

    const stakingFeatureMinimal = {
      id: `${this.meta.address}::${poolInfo.poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: poolInfo.stakedToken,
          },
          totalSupplied: totalStaked,
        },
      ],
      rewarded: [
        {
          token: { address: context.rewardToken },
          rewardPerSecond,
        },
      ],
    };

    if (poolInfo.additionalReward && poolInfo.additionalReward !== ZERO_ADDRESS) {
      const additionalRewardPerSecond = new BigNumber(poolInfo.additionalRewardPerSecond)
        .times(rewardShare)
        .toString();

      const reward = {
        token: { address: poolInfo.additionalReward },
        rewardPerSecond: additionalRewardPerSecond,
        extra: { rewarder: poolInfo.rewarder },
      };
      stakingFeatureMinimal.rewarded.push(reward);
    }

    return stakingFeatureMinimal;
  }

  protected formatOpportunityRewardedToken(
    poolToken: ISushiRewardTokenMinimal,
    token: ERC20Token,
    tvl: number,
  ): ISushiRewardTokenOpportunity {
    const tokensPerSecond = normalizeDecimals(poolToken.rewardPerSecond, token.decimals);
    const pricePerSecond = tokensPerSecond * token.price;

    const { apr: harvests } = this.getHarvestBreakdown(tokensPerSecond);
    const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);

    return {
      token,
      harvests,
      apr,
      apy,
      extra: { rewarder: poolToken.extra?.rewarder },
    };
  }
}

export const convexRewarder = '0x9e01aac4b3e8781a85b21d9d9f848e72af77b362';
