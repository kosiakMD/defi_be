import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ClaimableDto, ICallData, Logger, ProtocolNameEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  FeatureEnum,
  IslandswapProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MasterchefAbis } from './contracts/masterchef.abis';
import { SinglePoolAbis } from './contracts/pool.abis';

@Injectable()
export class IslandswapStaking {
  private readonly masterContract = '0x4500775B550A884b7fc4F78ff83712DaBf72A044';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly multicallService: MulticallAggregator,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${IslandswapProtocolEnum.islandswap}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicallData = await this.getDataWithMulticall(addresses, pools, chain);

    const base: BaseDataStaking[] = addresses.map((a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.islandswap,
        protocolName: ProtocolNameEnum.islandswap,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools);

      baseInfo.items = userStakingPositions;
      return baseInfo;
    });

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking, chain: ChainDto) {
    const calls = new Map<string, ICallData>();

    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        if (pool.poolId !== null) {
          calls.set(this.contractCallLabel(address, pool.address, pool.poolId), {
            address: pool.address,
            abi: MasterchefAbis.userInfo,
            input: {
              data: [pool.poolId, address],
            },
            output: {},
          });
        }
      });
    });

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    const balances: {
      id: string;
      poolId: number;
      balance: string;
      contract: string;
      pendingISL?: BigNumber;
      user: {
        address: string;
      };
    }[] = [];

    userBalances.forEach((callData, contractCallLabel) => {
      if (Number(callData.output.data.amount) > 0) {
        const [userAddress, poolAddress, poolId] = contractCallLabel.split('_');
        balances.push({
          id: contractCallLabel,
          poolId: Number(poolId),
          contract: poolAddress,
          balance: callData.output.data.amount,
          user: {
            address: userAddress,
          },
        });
      }
    });

    const pendingTokensCalls = new Map<string, ICallData>();
    balances.forEach((b) => {
      pendingTokensCalls.set(this.contractCallLabel(b.user.address, b.contract, b.poolId), {
        address: this.masterContract,
        abi: MasterchefAbis.pendingIsland,
        input: {
          data: [b.poolId, b.user.address],
        },
        output: {},
      });
    });

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
      chain.id,
    );

    balances.forEach((b) => {
      const claimableReward = claimableRewardsRsp.get(
        this.contractCallLabel(b.user.address, b.contract, b.poolId),
      ).output.data;
      b.pendingISL = new BigNumber(claimableReward.toString());
    });

    const singlePoolsBalances = await this.getSinglePoolBalance(addresses, pools, chain);
    balances.push(...singlePoolsBalances);

    return balances;
  }

  private async getSinglePoolBalance(
    addresses: string[],
    pools: NotifyStaking,
    chain: ChainDto,
  ): Promise<any[]> {
    const balances: {
      id: string;
      poolId: number | null;
      balance: string;
      contract: string;
      pendingISL?: BigNumber;
      user: {
        address: string;
      };
    }[] = [];

    const calls = new Map<string, ICallData>();

    const singlePools = pools.items.filter((p) => p.poolId === null);

    singlePools.forEach((pool) => {
      const poolContract = new SinglePoolAbis(pool.address);
      addresses.forEach((address) => {
        calls.set(this.userInfoLabel(address, pool.address), poolContract.userInfo(address));
        calls.set(
          this.pendingRewardLabel(address, pool.address),
          poolContract.pendingReward(address),
        );
      });
    });

    const singlePoolRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    addresses.forEach((userAddress) => {
      singlePools.forEach((pool) => {
        const stakedBalance = singlePoolRsp.get(this.userInfoLabel(userAddress, pool.address))
          .output.data.amount;
        const rewardBalance = singlePoolRsp.get(this.pendingRewardLabel(userAddress, pool.address))
          .output.data;
        if (stakedBalance > 0 || rewardBalance > 0) {
          balances.push({
            id: pool.address,
            poolId: null,
            balance: stakedBalance.toString(),
            contract: pool.address,
            pendingISL: rewardBalance,
            user: {
              address: userAddress,
            },
          });
        }
      });
    });

    return balances;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.filter((b) => b.user.address === userAddress);

    return balances;
  }

  private getStakingPositionsForAddress(balances, pools: NotifyStaking) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const indexedSPByPoolIdAndAddress = new Map<string, IntegrationStakingPositionDto>(
      pools.items.map((sp) => [sp.address + sp.poolId, sp]),
    );
    balances.forEach((b) => {
      const stakingPosition: IntegrationStakingPositionDto = indexedSPByPoolIdAndAddress.get(
        b.contract + b.poolId,
      );

      const stakedBigNumber = new BigNumber(b.balance).div(
        decimalsDivider(stakingPosition.stakingToken.decimals),
      );
      stakingPosition.stakingToken.balance = stakedBigNumber.toNumber();

      if (stakingPosition.stakingToken.tokens) {
        const poolShare = stakedBigNumber.div(
          new BigNumber(stakingPosition.stakingToken.totalSupply),
        );
        stakingPosition.stakingToken.tokens.forEach((clpt) => {
          clpt.balance = poolShare.times(new BigNumber(clpt.reserve)).toNumber();
        });
      }

      stakingPosition.staked = b.balance;

      if (b.pendingISL) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = b.pendingISL
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private contractCallLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }

  private userInfoLabel(address: string, contract: string) {
    return concatStrings(SinglePoolAbis.userInfo.name, address, contract);
  }

  private pendingRewardLabel(address: string, contract: string) {
    return concatStrings(SinglePoolAbis.pendingReward.name, address, contract);
  }
}
