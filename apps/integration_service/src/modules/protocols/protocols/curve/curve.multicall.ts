import { CallInput, MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';
import { JsonFragment } from "@ethersproject/abi";

import { Logger } from '@app/common';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { toDecimals } from '../../../../common/utils/util';

import { StakingDataInterface } from '../ellipsis/ellipsis.staking';
import { Abis, CurveAbis, GaugeAbi, GaugeRewardAbi } from './abis';
import { CurveAddresses } from '@app/common/constant/curve.addresses';

export class CurveMulticall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getUserBalances(addresses: string[], pools: IntegrationStakingPositionDto[]) {
    const inputs = addresses.flatMap((address) => {
      return pools.map((value) => ({
        target: value.address,
        function: Abis.balanceOf.name,
        args: [address],
      }));
    });

    const promises = this.getPromisesArray(inputs, CurveAbis);

    const result = await this.getPromisesResponse(promises);
    const balanceMap = new Map<string, StakingDataInterface[]>();
    result.forEach((balance, i) => {
      if (balance && !balance.isZero()) {
        const address = addresses[Math.floor(i / pools.length)];
        const pool = pools[i % pools.length];
        const mapItem = balanceMap.get(address);
        const stakingData = {
          stakingBalance: toDecimals(balance.toString(), pool.stakingToken.decimals),
          stakingPosition: JSON.parse(JSON.stringify(pool)),
        };
        mapItem ? mapItem.push(stakingData) : balanceMap.set(address, [stakingData]);
      }
    });
    return balanceMap;
  }

  async getUserRewardsBalances(balanceItemsMap: Map<string, StakingDataInterface[]>) {
    const addressesRewardsMap = new Map();
    for (const [key, value] of balanceItemsMap.entries()) {
      const claimableTokensInputs = new Map<string, CallInput>();
      const gaugeRewardContractInputs = new Map<string, CallInput[]>();
      const gaugeV2ContractInputs = new Map<string, CallInput[]>();
      for (const stakingData of value) {
        const gaugeAddress = stakingData.stakingPosition.address;
        claimableTokensInputs.set(gaugeAddress, {
          target: gaugeAddress,
          function: Abis.claimableTokens.name,
          args: [key],
        });

        if (stakingData.stakingPosition.rewards.length > 1) {
          gaugeRewardContractInputs.set(gaugeAddress, [
            {
              target: gaugeAddress,
              function: Abis.claimableReward.name,
              args: [key],
            },
            {
              target: gaugeAddress,
              function: Abis.claimedRewardFor.name,
              args: [key],
            },
          ]);

          stakingData.stakingPosition.rewards.forEach((reward) => {
            if (reward.address !== CurveAddresses.crvToken) {
              const mapItem = gaugeV2ContractInputs.get(stakingData.stakingPosition.address);
              const call = {
                target: gaugeAddress,
                function: Abis.claimableRewardAdditional.name,
                args: [key, reward.address],
              };
              mapItem
                ? mapItem.push(call)
                : gaugeV2ContractInputs.set(stakingData.stakingPosition.address, [call]);
            }
          });
        }
      }
      const [rewardContractResp, gaugeV2Contract, crvRewards] = await Promise.all([
        this.getAdditionalRewardsBalances(gaugeRewardContractInputs, GaugeRewardAbi),
        this.getAdditionalRewardsBalances(gaugeV2ContractInputs, GaugeAbi),
        this.getCrvRewardBalances(claimableTokensInputs),
      ]);
      const gaugeRewardsMap = new Map();
      crvRewards.forEach((value, key) => {
        const v2ContractRewards = gaugeV2Contract.get(key);
        const rewardContractRewards = rewardContractResp.get(key);
        const additionalRewards = rewardContractRewards
          ? [Number(rewardContractRewards[0]) - Number(rewardContractRewards[1])]
          : v2ContractRewards;

        gaugeRewardsMap.set(key, {
          crvReward: value,
          additionalRewards: additionalRewards ?? null,
        });
      });
      addressesRewardsMap.set(key, gaugeRewardsMap);
    }
    return addressesRewardsMap;
  }

  async getCrvRewardBalances(inputs: Map<string, CallInput>) {
    const promises = this.getPromisesArray(Array.from(inputs.values()), GaugeAbi);
    const resultMap = new Map<string, string>();
    const gauges = Array.from(inputs.keys());
    const resultArray = await this.getPromisesResponse(promises);
    resultArray.forEach((resp, index) => {
      resultMap.set(gauges[index], resp?.toString());
    });
    return resultMap;
  }

  async getAdditionalRewardsBalances(inputsMap: Map<string, CallInput[]>, abi: any) {
    const resultMap = new Map<string, string[]>();
    const promises = this.getPromisesArray(Array.from(inputsMap.values()).flat(), abi);
    const result = await this.getPromisesResponse(promises);
    let index = 0;
    inputsMap.forEach((value, key) => {
      value.forEach(() => {
        const balance = result[index]?.toString();
        if (balance) {
          const mapItem = resultMap.get(key);
          mapItem ? mapItem.push(balance) : resultMap.set(key, [balance]);
        }
        index++;
      });
    });
    return resultMap;
  }

  private getPromisesArray(inputs: CallInput[], abi: JsonFragment[]) {
    const chunk = 50;
    const promises = [];
    for (let i = 0; i < inputs.length; i += chunk) {
      const sliceInputs = inputs.slice(i, i + chunk);
      promises.push(this.multiCall(abi, sliceInputs));
    }
    return promises;
  }

  private async getPromisesResponse(promises: Promise<any>[]) {
    return (await Promise.all(promises)).flatMap((response) => response[1]);
  }
}
