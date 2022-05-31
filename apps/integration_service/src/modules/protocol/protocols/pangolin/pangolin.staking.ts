import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  PangolinProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationPoolTokenDto, IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';

import { CallData } from '../../../../common/dto';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chain/multicall/multicall.provider';
import { MulticallService } from '../../../chain/multicall/multicall.service';
import { Pancakev2MainStakingSubgraph } from '../../../subgraph/subgraphs/pancakev2-main-staking.subgraph';
import { Abis } from './abis';
import { PangolinAddresses } from './pangolin.addresses';

@Injectable()
export class PangolinStaking {
  private readonly multicall: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly v2MainStakingSubgraph: Pancakev2MainStakingSubgraph,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicall = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${PangolinProtocolEnum.pangolin}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

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

    const calls = this.getCallData(addresses, cachedPools.items);
    const resp: Map<string, CallData> = await this.multicall.handleInBatches(calls);

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
        if (stakingToken.tokens?.length) {
          const poolShare = new BigNumber(stakingBalance) //
            .div(stakingToken.totalSupply)
            .toString();
          stakingToken.tokens.forEach((token) => {
            this.modifyUnderlyingToken(token as IntegrationPoolTokenDto, poolShare);
          });
        } else {
          stakingPosition.stakingToken = {
            ...stakingPosition.stakingToken,
            balance: Number(stakingBalance),
            price: null,
            value: null,
          };
        }
        stakingPosition.rewards[0].claimableData = {
          balance: toDecimals(
            stakingData.claimableReward?.rewardValue,
            stakingPosition.rewards[0].decimals,
          ),
          value: null,
        };
        stakingPosition.rewards[0].price = null;
        staking.items.push(stakingPosition);
      });
    });
    return Array.from(baseDataStakingMap.values());
  }

  modifyUnderlyingToken(token: IntegrationPoolTokenDto, poolShare: string) {
    token.price = null;
    token.value = null;
    token.reserve = token.balance;
    token.balance = new BigNumber(poolShare) //
      .multipliedBy(token.reserve)
      .toNumber();
  }

  getRewardAndBalance(
    multicallResp: Map<string, CallData>,
    address: string,
    value: IntegrationStakingPositionDto,
  ) {
    let balance;
    let reward;
    if (value.poolId) {
      balance = multicallResp.get(PangolinStaking.getUserInfoLabel(address, value.poolId)).output
        .data.amount;
      const rewardResp = multicallResp
        .get(PangolinStaking.getPendingReward(address, value.poolId))
        .output.data.toString();
      reward = {
        rewardToken: PangolinAddresses.png,
        rewardValue: rewardResp,
      };
    } else {
      balance = multicallResp.get(PangolinStaking.getBalanceOfLabel(address, value.address)).output
        .data;
      reward = {
        rewardToken: value.rewards[0].address,
        rewardValue: multicallResp
          .get(PangolinStaking.getEarnedLabel(address, value.address))
          ?.output.data.toNumber(),
      };
    }
    return [balance, reward];
  }

  private getStakingBalanceAndClaimableRewards(
    multicallResp: Map<string, CallData>,
    pools: IntegrationStakingPositionDto[],
    addresses: Address[],
  ): Map<string, StakingDataInterface[]> {
    const balanceMap: Map<string, StakingDataInterface[]> = new Map();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        try {
          const [balance, reward] = this.getRewardAndBalance(multicallResp, address, value);
          if (!balance.isZero()) {
            const result: StakingDataInterface = {
              stakingBalance: toDecimals(balance, value.stakingToken.decimals),
              stakingPosition: JSON.parse(JSON.stringify(value)),
              claimableReward: reward,
            };
            const userBalances = balanceMap.get(address);
            userBalances ? userBalances.push(result) : balanceMap.set(address, [result]);
          }
        } catch (e) {
          this.logger.error(e, 'getStakingBalanceAndClaimableRewards');
        }
      });
    });
    return balanceMap;
  }

  getChiefPoolCallsData(address: string, poolId: number, abi: AbiItem) {
    return plainToClass(CallData, {
      address: PangolinAddresses.chief,
      abi: abi,
      input: {
        data: [poolId, address],
      },
    });
  }

  getNonChiefPoolCallsData(address: string, poolAddress: string, abi: AbiItem) {
    return plainToClass(CallData, {
      address: poolAddress,
      abi: abi,
      input: {
        data: [address],
      },
    });
  }

  private getCallData(addresses: string[], pools: IntegrationStakingPositionDto[]) {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    addresses.forEach((address) => {
      pools.forEach((value) => {
        if (!value.poolId) {
          calls.set(
            PangolinStaking.getBalanceOfLabel(address, value.address),
            this.getNonChiefPoolCallsData(address, value.address, Abis.balanceOf),
          );
          calls.set(
            PangolinStaking.getEarnedLabel(address, value.address),
            this.getNonChiefPoolCallsData(address, value.address, Abis.earned),
          );
        } else {
          calls.set(
            PangolinStaking.getUserInfoLabel(address, value.poolId),
            this.getChiefPoolCallsData(address, value.poolId, Abis.userInfo),
          );
          calls.set(
            PangolinStaking.getPendingReward(address, value.poolId),
            this.getChiefPoolCallsData(address, value.poolId, Abis.pendingReward),
          );
        }
      });
    });

    return calls;
  }

  private static getUserInfoLabel(userAddress: string, poolId: number) {
    return concatStrings(Abis.userInfo.name, userAddress, poolId);
  }

  private static getPendingReward(userAddress: string, poolId: number) {
    return concatStrings(Abis.pendingReward.name, userAddress, poolId);
  }

  private static getBalanceOfLabel(userAddress: string, poolAddress: string) {
    return concatStrings(Abis.balanceOf.name, userAddress, poolAddress);
  }

  private static getEarnedLabel(userAddress: string, poolAddress: string) {
    return concatStrings(Abis.earned.name, userAddress, poolAddress);
  }
}

export interface StakingDataInterface {
  stakingBalance: number;
  stakingPosition: IntegrationStakingPositionDto;
  claimableReward: { rewardToken: string; rewardValue: string };
}
