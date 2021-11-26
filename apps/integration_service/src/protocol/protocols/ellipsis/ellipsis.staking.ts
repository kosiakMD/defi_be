import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  EllipsisProtocolEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { ellipsisPoolsMap } from '@app/common/jobs/ellipsis.pools.map';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';

import { CallData } from '../../../chain/dto/call.data';
import { MulticallProvider } from '../../../chain/multicall.provider';
import { MulticallService } from '../../../chain/multicall.service';
import { BaseData } from '../../../interfaces/transactions.interfaces';
import { toDecimals } from '../../../utils/util';
import { Abis } from './abi';
import { ellipsisLpStaker, epsToken } from './util';

@Injectable()
export class EllipsisStaking {
  private readonly multicall: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicall = multicallProvider.getForChain(ChainAbbrEnum.bsc);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${EllipsisProtocolEnum.ellipsis}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const calls = this.getCallData(addresses, cachedPools.items);
    const resp: Map<string, CallData> = await this.multicall.handleInBatches(calls);
    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.pancake,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const usersStakingPositions = this.getStakingBalanceAndClaimableRewards(
      resp,
      cachedPools.items,
      addresses,
    );

    usersStakingPositions.forEach((value, key) => {
      const staking = baseDataStakingMap.get(key);
      value.forEach((stakingData) => {
        const stakingBalance = stakingData.stakingBalance;
        const {
          stakingPosition,
          stakingPosition: { stakingToken },
        } = stakingData;
        stakingPosition.staked = stakingBalance;
        if (stakingToken.tokens.length) {
          const poolShare = new BigNumber(stakingBalance).div(stakingToken.totalSupply);
          stakingToken.tokens.forEach((token) => {
            token.price = null;
            token.value = null;
            token.balance = poolShare.multipliedBy(token.reserve).toNumber();
          });
        } else {
          stakingPosition.stakingToken = {
            ...stakingPosition.stakingToken,
            balance: stakingBalance,
            price: null,
            value: null,
          };
        }
        stakingPosition.rewards.forEach((reward) => {
          const rewardData = stakingData.claimableReward.find(
            (data) => data.rewardToken === reward.address,
          );
          reward.claimableData = {
            balance: toDecimals(rewardData?.rewardValue, reward.decimals),
            value: null,
          };
          reward.price = null;
        });
        staking.items.push(stakingPosition);
      });
    });
    return Array.from(baseDataStakingMap.values());
  }

  private getStakingBalanceAndClaimableRewards(
    multicallResp: Map<string, CallData>,
    pools: IntegrationStakingPositionDto[],
    addresses: Address[],
  ): Map<string, StakingDataInterface[]> {
    const balanceMap: Map<string, StakingDataInterface[]> = new Map();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        const stakingTokenData = ellipsisPoolsMap.get(value.stakingToken.address);
        const [balance, reward] = this.getRewardAndBalance(
          multicallResp,
          address,
          value,
          stakingTokenData.coins,
        );
        if (!balance.isZero()) {
          const result: StakingDataInterface = {
            stakingBalance: toDecimals(balance, value.stakingToken.decimals),
            stakingPosition: value,
            claimableReward: reward,
          };
          balanceMap.get(address)
            ? balanceMap.get(address).push(result)
            : balanceMap.set(address, [result]);
        }
      });
    });
    return balanceMap;
  }

  private getRewardAndBalance(
    multicallResp: Map<string, CallData>,
    address: string,
    value: IntegrationStakingPositionDto,
    coins?: number,
  ) {
    let balance;
    let reward;
    if (!coins) {
      balance = multicallResp.get(this.getTotalBalanceLabel(address)).output.data;
      const rewardResp = multicallResp.get(this.getClaimableRewardsLabel(address)).output.data;
      reward = rewardResp.map((item) => {
        return { rewardToken: item[0].toLowerCase(), rewardValue: Number(item[1]) };
      });
    } else {
      balance = multicallResp.get(this.getUserInfoLabel(address, value.poolId)).output.data?.amount;
      reward = [
        {
          rewardToken: epsToken,
          rewardValue: multicallResp
            .get(this.getClaimableRewardLabel(address, value.poolId))
            .output.data.toNumber(),
        },
      ];
    }
    return [balance, reward];
  }

  private getCallData(addresses: string[], pools: IntegrationStakingPositionDto[]) {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        const stakingTokenData = ellipsisPoolsMap.get(value.stakingToken.address);
        if (!stakingTokenData.coins) {
          calls.set(
            this.getTotalBalanceLabel(address),
            plainToClass(CallData, {
              address: stakingTokenData.minter,
              abi: Abis.totalBalance,
              input: {
                data: [address],
              },
            }),
          );
          calls.set(
            this.getClaimableRewardsLabel(address),
            plainToClass(CallData, {
              address: stakingTokenData.minter,
              abi: Abis.claimableRewards,
              input: {
                data: [address],
              },
            }),
          );
        } else {
          calls.set(
            this.getUserInfoLabel(address, value.poolId),
            plainToClass(CallData, {
              address: ellipsisLpStaker,
              abi: Abis.userInfo,
              input: {
                data: [value.poolId, address],
              },
            }),
          );

          calls.set(
            this.getClaimableRewardLabel(address, value.poolId),
            plainToClass(CallData, {
              address: ellipsisLpStaker,
              abi: Abis.claimableReward,
              input: {
                data: [value.poolId, address],
              },
            }),
          );
        }
      });
    });

    return calls;
  }

  private getTotalBalanceLabel(userAddress: string) {
    return concatStrings(Abis.totalBalance.name, userAddress);
  }

  private getClaimableRewardsLabel(userAddress: string) {
    return concatStrings(Abis.claimableRewards.name, userAddress);
  }

  private getClaimableRewardLabel(userAddress: string, poolId: number) {
    return concatStrings(Abis.claimableReward.name, userAddress, poolId);
  }

  private getUserInfoLabel(userAddress: string, poolId: number) {
    return concatStrings(Abis.userInfo.name, userAddress, poolId);
  }
}

export interface StakingDataInterface {
  stakingBalance: number;
  stakingPosition: IntegrationStakingPositionDto;
  claimableReward: [{ rewardToken: string; rewardValue: string }];
}
