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
  TraderjoeProtocolEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { TraderjoeAbis } from './contracts/traderjoe.abis';

@Injectable()
export class TraderJoeStaking {
  private readonly masterChiefAddressV2 = '0xd6a4f121ca35509af06a0be99093d08462f53052';
  private readonly masterChiefAddressV3 = '0x188bed1968b795d5c9022f6a0bb5931ac4c18f00';
  private readonly multicallService: MulticallService;

  private static pendingTokensLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${TraderjoeProtocolEnum.traderjoe}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const base: BaseDataStaking[] = [];

    const multicallData = await this.getDataWithMulticall(addresses, pools);

    for (const a of addresses) {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.traderjoe,
        protocolName: ProtocolNameEnum.traderjoe,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const userMulticallData = this.getMulticallDataForAddress(multicallData, a);

      const userStakingPositions: IntegrationStakingPositionDto[] =
        this.getStakingPositionsForAddress(userMulticallData, pools);

      baseInfo.items.push(...userStakingPositions);
      base.push(baseInfo);
    }

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], pools: NotifyStaking) {
    const calls = new Map<string, ICallData>();
    for (const address of addresses) {
      for (const pool of pools.items) {
        calls.set(TraderJoeStaking.pendingTokensLabel(address, pool.address, pool.poolId), {
          address: pool.address,
          abi: TraderjoeAbis.userInfo,
          input: {
            data: [pool.poolId, address],
          },
          output: {},
        });
      }
    }

    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const balances: {
      id: string;
      balance: string;
      contract: string;
      user: {
        id: string;
      };
    }[] = [];

    for (const userBalance of userBalances.entries()) {
      if (Number(userBalance[1].output.data.amount) > 0) {
        balances.push({
          id: userBalance[0],
          contract: userBalance[0].split('_')[1],
          balance: userBalance[1].output.data.amount,
          user: {
            id: userBalance[0].split('_')[0],
          },
        });
      }
    }

    const claimableRewards: {
      contract: string;
      poolId: number;
      pendingJoe?: BigNumber;
      userAddress: string;
      pendingBonusToken?: BigNumber;
      bonusTokenAddress?: string;
    }[] = [];
    balances.forEach((b) => {
      claimableRewards.push({
        contract: b.contract,
        poolId: Number(b.id.split('_')[2]),
        userAddress: b.user.id,
      });
    });

    const pendingTokensCalls = new Map<string, ICallData>();
    claimableRewards.forEach((d) => {
      pendingTokensCalls.set(
        TraderJoeStaking.pendingTokensLabel(d.userAddress, d.contract, d.poolId),
        {
          address: d.contract,
          abi: TraderjoeAbis.pendingTokens,
          input: {
            data: [d.poolId, d.userAddress],
          },
          output: {},
        },
      );
    });

    const claimableRewardsRsp: Map<string, ICallData> = await this.multicallService.handleInBatches(
      pendingTokensCalls,
    );

    claimableRewards.forEach((d, i) => {
      if (d.contract === this.masterChiefAddressV2) {
        const claimableReward = claimableRewardsRsp.get(
          TraderJoeStaking.pendingTokensLabel(d.userAddress, d.contract, d.poolId),
        ).output.data;
        claimableRewards[i].pendingJoe = new BigNumber(claimableReward.pendingJoe.toString());
      } else {
        const claimableReward = claimableRewardsRsp.get(
          TraderJoeStaking.pendingTokensLabel(d.userAddress, d.contract, d.poolId),
        ).output.data;
        claimableRewards[i].pendingJoe = new BigNumber(claimableReward.pendingJoe.toString());
        claimableRewards[i].pendingBonusToken = new BigNumber(
          claimableReward.pendingBonusToken.toString(),
        );
        claimableRewards[i].bonusTokenAddress = claimableReward.bonusTokenAddress;
      }
    });

    return { balances, claimableRewards };
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.balances.filter((b) => b.user.id === userAddress);
    const claimableRewards = multicallData.claimableRewards.filter(
      (r) => r.userAddress === userAddress,
    );

    return { balances, claimableRewards };
  }

  private getStakingPositionsForAddress({ balances, claimableRewards }, pools: NotifyStaking) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    balances.forEach((b) => {
      const balancePoolId = Number(b.id.split('_')[2]);
      const stakingPosition: IntegrationStakingPositionDto = pools.items.find(
        (sp) => Number(sp.poolId) === balancePoolId && sp.address === b.contract,
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

      // find and set claimable rewards:
      const claimableReward = claimableRewards.find(
        (cr) => cr.userAddress === b.user.id && cr.poolId === balancePoolId,
      );

      if (claimableReward) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = claimableReward.pendingJoe
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();

        if (stakingPosition.rewards.length > 1 && claimableReward.bonusTokenAddress) {
          stakingPosition.rewards[1].claimableData = plainToClass(ClaimableDto, {});
          stakingPosition.rewards[1].address = claimableReward.bonusTokenAddress.toLowerCase();
          stakingPosition.rewards[1].claimableData.balance = claimableReward.pendingBonusToken
            .div(decimalsDivider(stakingPosition.rewards[1].decimals))
            .toString();
        }
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }
}
