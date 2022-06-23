import { AbiItem } from 'web3-utils';

import { Address } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { balanceOfLabel, CurveStakingEth, ICurveStakingFeatureMinimal } from './CurveStakingEth';
import { CurveApi } from './curve/curve.api';

export class CurveStakingNonEth extends CurveStakingEth {
  protected async getAdditionalGaugesFromApi() {
    const curveApi = new CurveApi(this.httpService);
    const { gauges } = await curveApi.getApiGauges(this.meta.context.gaugesUrl);
    return gauges
      .filter((gauge) => gauge.gauge_data.totalSupply > 0)
      .map((gauge) => {
        const gaugeItem = {
          poolId: gauge.symbol,
          pool: gauge.swap.toLowerCase(),
          gauge: gauge.gauge.toLowerCase(),
          lpToken: gauge.swap_token.toLowerCase(),
          rewards: gauge.extraRewards.map((reward) => ({
            address: reward.tokenAddress.toLowerCase(),
            apy: reward.apy,
          })),
          totalSupplied: gauge.gauge_data.totalSupply,
          name: gauge.name,
          api: true,
        };
        gaugeItem.rewards.push({ address: this.meta.context.rewardToken, apy: 0 });
        return gaugeItem;
      });
  }

  protected async getRewards(gaugeData: { gauge: string; lp: string }[]) {
    const calls = new Map();
    gaugeData.forEach(({ gauge, lp }) => {
      const gaugeContract = new DynamicContract(gauge);
      [0, 1, 2].forEach((idx) => {
        calls.set(`${gauge}.${lp}.${idx}`, gaugeContract.createCall(rewardTokens, idx));
      });
    });

    const multicallResp = await this.multicall.handleInBatches(calls, this.meta.chain);
    return gaugeData.reduce((resp, data) => {
      const rewardTokens = new Set(
        [0, 1, 2]
          .map((index) =>
            multicallResp.get(`${data.gauge}.${data.lp}.${index}`)?.output.data.toLowerCase(),
          )
          .filter((token) => token && token !== ZERO_ADDRESS),
      );
      rewardTokens.add(this.meta.context.rewardToken);
      resp.set(`${data.gauge}.${data.lp}`, Array.from(rewardTokens));
      return resp;
    }, new Map());
  }

  protected async updateRealTimeData(
    opportunities: ICurveStakingFeatureMinimal[],
  ): Promise<ICurveStakingFeatureMinimal[]> {
    const curveApi = new CurveApi(this.httpService);
    const [poolsAPIData, { sideChainGaugesApys }] = await Promise.all([
      curveApi.getSubgraphPoolData(this.meta.context.poolSubgraphDataUrl),
      curveApi.getCrvApysData(this.meta.context.apyUrl),
    ]);

    const crvApyMap = new Map(
      sideChainGaugesApys?.map((gauge) => [gauge.address.toLowerCase(), gauge.apy]),
    );

    const subgraphDataMap = poolsAPIData.poolList.reduce((resp, info) => {
      resp.set(info.address.toLowerCase(), info);
      return resp;
    }, new Map());

    return opportunities.map((opportunity) => {
      const subgraphData = subgraphDataMap.get(opportunity.meta.minter);
      opportunity.supplied[0].extra.apy = subgraphData?.latestDailyApy;
      const crv = opportunity.rewarded.find(
        (reward) => reward.token.address === this.meta.context.rewardToken,
      );
      crv.extra.apy = Number(crvApyMap.get(opportunity.meta.minter) || 0);
      return opportunity;
    });
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const calls = new Map();

    pools.forEach((pool) => {
      const contract = new DynamicContract(pool.meta.gauge);
      calls.set(
        balanceOfLabel(contract.address, address),
        contract.createCall(ERC20.balanceOf, address),
      );

      pool.rewarded.forEach((reward) => {
        calls.set(
          claimableRewardLabel(contract.address, address, reward.token.address),
          contract.createCall(
            pool.meta.api ? claimableReward : claimableRewardWrite,
            address,
            reward.token.address,
          ),
        );
      });
    });

    const userBalances = await this.multicall.handleInBatches(calls, this.meta.chain);
    return pools
      .map((p) => {
        return this.formatUserData(address, p, userBalances);
      })
      .filter((ub) => ub !== undefined);
  }

  protected formatUserRewardsData(
    address: Address,
    usersPool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ) {
    return usersPool.rewarded.map((reward) => {
      const bnData = data.get(
        claimableRewardLabel(usersPool.meta.gauge, address, reward.token.address),
      )?.output.data;
      const amount = normalizeDecimals(bnData.toString(), reward.token.decimals);
      return {
        ...reward,
        amount,
        value: amount * reward.token.price,
      };
    });
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<{ data: Map<Address, IStakingFeatureUserEntry[]>; errors: Error[] }> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, IStakingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as IStakingFeatureUserEntry[]]),
    );

    await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const userPools = await this.fetchUserData(address, pools);
          // An array of undefined values can be obtained
          const filteredPools = userPools.filter((data) => data);
          if (filteredPools.length) {
            results.get(address).push(...filteredPools);
          }
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    return { data: results, errors };
  }
}

function claimableRewardLabel(lpStaker: Address, user: Address, lpToken: Address): string {
  return `${lpStaker}.claimableReward(${user}, ${lpToken})`;
}

export const rewardTokens: AbiItem = {
  stateMutability: 'view',
  type: 'function',
  name: 'reward_tokens',
  inputs: [{ name: 'arg0', type: 'uint256' }],
  outputs: [{ name: '', type: 'address' }],
};

export const claimableReward: AbiItem = {
  stateMutability: 'view',
  type: 'function',
  name: 'claimable_reward',
  inputs: [
    { name: '_user', type: 'address' },
    { name: '_reward_token', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
};

export const claimableRewardWrite: AbiItem = {
  stateMutability: 'nonpayable',
  type: 'function',
  name: 'claimable_reward_write',
  inputs: [
    { name: '_addr', type: 'address' },
    { name: '_token', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
};
