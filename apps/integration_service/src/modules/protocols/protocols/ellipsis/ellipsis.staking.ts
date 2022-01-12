import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  EllipsisProtocolEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { EllipsisMulticall } from '@app/common/jobs/ellipsis/ellipsis.multicall';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import {
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';

import { CallData } from '../../../../common/dto';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { Abis } from './contracts/ellipsis.abi';
import { ellipsisLpStaker, epsToken } from './ellipsis.constants';

@Injectable()
export class EllipsisStaking {
  private readonly multicall: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly multicallProvider: MulticallProvider,
    private readonly web3ProviderService: Web3ProviderService,
  ) {
    this.multicall = multicallProvider.getForChain(ChainAbbrEnum.bsc);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${EllipsisProtocolEnum.ellipsis}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const ellipsisMulticall = new EllipsisMulticall(
      this.web3ProviderService.getInstanceByChainId(ChainIdEnum.bsc),
    );
    const poolsMinters = await ellipsisMulticall.getMinters(
      cachedPools.items.map((item) => item.stakingToken.address),
    );

    const calls = this.getCallData(addresses, cachedPools.items, poolsMinters);
    const resp: Map<string, CallData> = await this.multicall.handleInBatches(calls);
    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.ellipsis,
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
        const stakingBalance = stakingData.stakingBalance.toString();
        const {
          stakingPosition,
          stakingPosition: { stakingToken },
        } = stakingData;
        stakingPosition.staked = stakingBalance;
        if (stakingToken.tokens.length) {
          const poolShare = new BigNumber(stakingBalance) //
            .div(stakingToken.totalSupply)
            .toString();
          stakingToken.tokens.forEach((token) => {
            this.modifyUnderlyingToken(token, poolShare);
            if ((token as UnderlyingStakingLp).tokens?.length) {
              (token as UnderlyingStakingLp).tokens.forEach((underlyingToken) => {
                this.modifyUnderlyingToken(underlyingToken, poolShare);
              });
            }
          });
        } else {
          stakingPosition.stakingToken = {
            ...stakingPosition.stakingToken,
            balance: Number(stakingBalance),
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

  private modifyUnderlyingToken(token: UnderlyingTokenDto, poolShare: string) {
    token.price = null;
    token.value = null;
    token.reserve = token.balance;
    token.balance = new BigNumber(poolShare) //
      .multipliedBy(token.reserve)
      .toNumber();
  }

  private getStakingBalanceAndClaimableRewards(
    multicallResp: Map<string, CallData>,
    pools: IntegrationStakingPositionDto[],
    addresses: Address[],
  ): Map<string, StakingDataInterface[]> {
    const balanceMap: Map<string, StakingDataInterface[]> = new Map();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        const [balance, reward] = this.getRewardAndBalance(
          multicallResp,
          address,
          value,
          value.stakingToken.tokens?.length,
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
      balance = multicallResp.get(EllipsisStaking.getTotalBalanceLabel(address)).output.data;
      const rewardResp = multicallResp.get(EllipsisStaking.getClaimableRewardsLabel(address)).output
        .data;
      reward = rewardResp.map((item) => {
        return { rewardToken: item[0].toLowerCase(), rewardValue: Number(item[1]) };
      });
    } else {
      balance = multicallResp.get(EllipsisStaking.getUserInfoLabel(address, value.poolId)).output
        .data?.amount;
      reward = [
        {
          rewardToken: epsToken,
          rewardValue: multicallResp
            .get(EllipsisStaking.getClaimableRewardLabel(address, value.poolId))
            .output.data.toNumber(),
        },
      ];
    }
    return [balance, reward];
  }

  private getCallData(
    addresses: string[],
    pools: IntegrationStakingPositionDto[],
    poolsMinters: Map<string, string>,
  ) {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        const minter = poolsMinters.get(value.stakingToken.address);
        if (!value.stakingToken.tokens?.length) {
          calls.set(
            EllipsisStaking.getTotalBalanceLabel(address),
            plainToClass(CallData, {
              address: minter,
              abi: Abis.totalBalance,
              input: {
                data: [address],
              },
            }),
          );
          calls.set(
            EllipsisStaking.getClaimableRewardsLabel(address),
            plainToClass(CallData, {
              address: minter,
              abi: Abis.claimableRewards,
              input: {
                data: [address],
              },
            }),
          );
        } else {
          calls.set(
            EllipsisStaking.getUserInfoLabel(address, value.poolId),
            plainToClass(CallData, {
              address: ellipsisLpStaker,
              abi: Abis.userInfo,
              input: {
                data: [value.poolId, address],
              },
            }),
          );

          calls.set(
            EllipsisStaking.getClaimableRewardLabel(address, value.poolId),
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

  private static getTotalBalanceLabel(userAddress: string) {
    return concatStrings(Abis.totalBalance.name, userAddress);
  }

  private static getClaimableRewardsLabel(userAddress: string) {
    return concatStrings(Abis.claimableRewards.name, userAddress);
  }

  private static getClaimableRewardLabel(userAddress: string, poolId: number) {
    return concatStrings(Abis.claimableReward.name, userAddress, poolId);
  }

  private static getUserInfoLabel(userAddress: string, poolId: number) {
    return concatStrings(Abis.userInfo.name, userAddress, poolId);
  }
}

export interface StakingDataInterface {
  stakingBalance: number;
  stakingPosition: IntegrationStakingPositionDto;
  claimableReward?: [{ rewardToken: string; rewardValue: string }];
}

export type UnderlyingTokenDto = IntegrationPoolTokenDto | UnderlyingStakingLp;
