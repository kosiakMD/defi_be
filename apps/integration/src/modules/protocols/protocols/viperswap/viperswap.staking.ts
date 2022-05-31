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
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  ViperswapProtocolEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { Abis } from './contracts/abis';

@Injectable()
export class ViperswapStaking {
  private readonly masterBreeder = '0x7abc67c8d4b248a38b0dc5756300630108cb48b4';
  private readonly multicallService: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.harm);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${ViperswapProtocolEnum.viperswap}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicallData = await this.getDataWithMulticall(addresses, pools);
    const lockPercent = await this.getLockPercent();

    const base: BaseDataStaking[] = addresses.map((a) => {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.viperswap,
        protocolName: ProtocolNameEnum.viperswap,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools, lockPercent);

      baseInfo.items = userStakingPositions;
      return baseInfo;
    });

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking) {
    const calls = new Map<string, ICallData>();
    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        calls.set(this.contractCallLabel(address, pool.address, pool.poolId), {
          address: pool.address,
          abi: Abis.userInfo,
          input: {
            data: [pool.poolId, address],
          },
          output: {},
        });
      });
    });

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const balances: {
      id: string;
      poolId: number;
      balance: string;
      contract: string;
      pendingViper?: BigNumber;
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
        address: this.masterBreeder,
        abi: Abis.pendingReward,
        input: {
          data: [b.poolId, b.user.address],
        },
        output: {},
      });
    });

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
    );

    balances.forEach((b) => {
      const claimableReward = claimableRewardsRsp.get(
        this.contractCallLabel(b.user.address, b.contract, b.poolId),
      ).output.data;
      b.pendingViper = new BigNumber(claimableReward.toString());
    });

    return balances;
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.filter((b) => b.user.address === userAddress);

    return balances;
  }

  private getStakingPositionsForAddress(balances, pools: NotifyStaking, lockPercent: number) {
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

      if (b.pendingViper) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = b.pendingViper
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
        stakingPosition.rewards[0].claimableData.lockedBalance = (
          Number(stakingPosition.rewards[0].claimableData.balance) * lockPercent
        ).toString();
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private async getLockPercent() {
    const masterBreeder = new Abis(this.masterBreeder);

    const call = new Map<string, ICallData>();
    call.set(Abis.getLockPercent.name, masterBreeder.getLockPercent());

    const lockPercentCall: Map<string, ICallData> = await this.multicallService.handleInBatches(
      call,
    );

    return lockPercentCall.get(Abis.getLockPercent.name).output.data / 100;
  }

  private contractCallLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }
}
