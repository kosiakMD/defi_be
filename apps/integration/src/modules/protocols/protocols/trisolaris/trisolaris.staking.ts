import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  ICallData,
  Logger,
  ProtocolNameEnum,
  TrisolarisProtocolEnum,
} from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { TrisolarisAbi } from './contracts/abi';

@Injectable()
export class TrisolarisStaking {
  private readonly multicallService: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.near);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${TrisolarisProtocolEnum.trisolaris}_${FeatureEnum.staking}`;
    const pools: NotifyStaking = await this.cache.get(key);
    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicallData = await this.getDataWithMulticall(addresses, pools);
    const base: BaseDataStaking[] = addresses.map((a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.trisolaris,
        protocolName: ProtocolNameEnum.trisolaris,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      baseInfo.items = this.getStakingPositionsForAddress(userMulticallData, pools);
      return baseInfo;
    });

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking) {
    //get address double rewarder
    const callsRewarderList = new Map<string, ICallData>();
    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        const trisolarisAbi = new TrisolarisAbi(pool.address);
        callsRewarderList.set(
          `${address} ${pool.address} ${pool.poolId}`,
          trisolarisAbi.rewarder(pool.poolId),
        );
      });
    });

    const listRewarderAdresses: Map<string, ICallData> =
      await this.multicallService.handleInBatches(callsRewarderList);

    const calls = new Map<string, ICallData>();
    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        const trisolarisAbi = new TrisolarisAbi(pool.address);
        calls.set(
          this.contractCallLabel(address, pool.address, pool.poolId),
          trisolarisAbi.userInfo(pool.poolId, address),
        );
      });
    });

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const balances: {
      id: string;
      poolId: number;
      balance: string;
      contract: string;
      pendingTri?: BigNumber;
      pendingDouble?: BigNumber;
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
      const trisolarisAbi = new TrisolarisAbi(b.contract);
      pendingTokensCalls.set(
        this.contractCallLabel(b.user.address, b.contract, b.poolId),
        trisolarisAbi.pendingTri(b.poolId, b.user.address),
      );
      const rewarderAddress = listRewarderAdresses.get(
        `${b.user.address} ${b.contract} ${b.poolId}`,
      ).output.data;
      if (rewarderAddress !== ZERO_ADDRESS) {
        const trisolarisAbiRewarder = new TrisolarisAbi(rewarderAddress);
        pendingTokensCalls.set(
          `${this.contractCallLabel(b.user.address, b.contract, b.poolId)}_double_reward`,
          trisolarisAbiRewarder.pendingTokens(b.poolId, b.user.address, b.poolId),
        );
      }
    });

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
    );

    balances.forEach((b) => {
      const claimableReward = claimableRewardsRsp.get(
        this.contractCallLabel(b.user.address, b.contract, b.poolId),
      ).output.data;
      const claimableDoubleReward = claimableRewardsRsp.get(
        `${this.contractCallLabel(b.user.address, b.contract, b.poolId)}_double_reward`,
      )?.output.data;
      b.pendingTri = new BigNumber(claimableReward.toString());
      if (claimableDoubleReward) {
        b.pendingDouble = new BigNumber(claimableDoubleReward.rewardAmounts.toString());
      }
    });

    return balances;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    return multicallData.filter((b) => b.user.address === userAddress);
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

      if (b.pendingTri) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = b.pendingTri
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      }

      if (b.pendingDouble) {
        stakingPosition.rewards[1].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[1].claimableData.balance = b.pendingDouble
          .div(decimalsDivider(stakingPosition.rewards[1].decimals))
          .toString();
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private contractCallLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }
}
