import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ChainIdEnum,
  ClaimableDto,
  ICallData,
  Logger,
  ProtocolNameEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { AutofarmProtocolEnum, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings, decimalsDivider } from '@app/common/utils';

import { MulticallProvider } from '../../../chain/multicall/multicall.provider';
import { MulticallService } from '../../../chain/multicall/multicall.service';
import { PriceService } from '../../../microservice/price.service';
import { Abis } from './contracts/abis';

@Injectable()
export class AutofarmStaking {
  private readonly masterChiefAddresses = new Map([
    [ChainIdEnum.avax, '0x864a0b7f8466247a0e44558d29cdc37d4623f213'],
    [ChainIdEnum.bnb, '0x0895196562c7868c5be92459fae7f877ed450452'],
    [ChainIdEnum.cro, '0x76b8c3ecdf99483335239e66f34191f11534cbaa'],
    [ChainIdEnum.celo, '0xdd11b66b90402f294a017c4688509c364312303f'],
    [ChainIdEnum.ftm, '0x76b8c3ecdf99483335239e66f34191f11534cbaa'],
    [ChainIdEnum.harm, '0x9c57658139afb41949cebc07d806f37d29d13eea'],
    [ChainIdEnum.heco, '0x96a29c4bce3126266983f535b41c30dba80d5d99'],
    [ChainIdEnum.mriver, '0xfada8cc923514f1d7b0586ad554b4a0cead4680e'],
    [ChainIdEnum.okex, '0x864a0b7f8466247a0e44558d29cdc37d4623f213'],
    [ChainIdEnum.plg, '0x89d065572136814230a55ddeeddec9df34eb0b76'],
  ]);
  private readonly autofarmVault = '0x763a05bdb9f8946d8c3fa72d1e0d3f5e68647e5c';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${AutofarmProtocolEnum.autofarm}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const multicall: MulticallService = this.multicallProvider.getForChain(chain.abbr);
    const masterContract: string = this.masterChiefAddresses.get(chain.id);

    const base: BaseDataStaking[] = [];

    const multicallData = await this.getDataWithMulticall(
      addresses,
      multicall,
      masterContract,
      pools,
    );

    for (const a of addresses) {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.autofarm,
        protocolName: ProtocolNameEnum.autofarm,
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

  private async getDataWithMulticall(addresses: Address[], multicall, contract, pools) {
    const userInfos = await this.getStakedTokens(addresses, multicall, pools);

    const poolsWithBalance = [];

    for (const userInfo of userInfos.entries()) {
      // don't show zero and little balances
      if (Number(userInfo[1].output.data) > 0) {
        const data = userInfo[0].split('_');
        poolsWithBalance.push({
          contract: data[0],
          userAddress: data[1],
          poolId: Number(data[2]),
          balance: userInfo[1].output.data,
        });
      }
    }

    const balances: {
      id: string;
      balance: string;
      want: string;
      contract: string;
      user: {
        id: string;
      };
    }[] = [];

    for (const userBalance of poolsWithBalance) {
      balances.push({
        id: this.balanceOfLabel(userBalance.contract, userBalance.userAddress, userBalance.poolId),
        want: userBalance.want,
        contract: userBalance.contract,
        balance: userBalance.balance,
        user: {
          id: userBalance.userAddress,
        },
      });
    }

    const claimableRewards: {
      contract: string;
      poolId: number;
      pendingAUTO?: BigNumber;
      userAddress: string;
      pendingBonusToken?: BigNumber;
      bonusTokenAddress?: string;
    }[] = [];

    if (contract === this.masterChiefAddresses.get(ChainIdEnum.bnb)) {
      balances.forEach((b) => {
        if (b.contract !== this.autofarmVault) {
          claimableRewards.push({
            contract: b.contract,
            poolId: Number(b.id.split('_')[2]),
            userAddress: b.user.id,
          });
        }
      });

      const pendingTokensCalls = new Map<string, ICallData>();
      claimableRewards.forEach((d) => {
        pendingTokensCalls.set(this.pendingTokensLabel(d.userAddress, d.contract, d.poolId), {
          address: d.contract,
          abi: Abis.pendingAUTO,
          input: {
            data: [d.poolId, d.userAddress],
          },
          output: {},
        });
      });

      const claimableRewardsRsp: Map<string, ICallData> = await multicall.handleInBatches(
        pendingTokensCalls,
      );

      claimableRewards.forEach((d, i) => {
        const claimableReward = claimableRewardsRsp.get(
          this.pendingTokensLabel(d.userAddress, d.contract, d.poolId),
        ).output.data;
        claimableRewards[i].pendingAUTO = new BigNumber(claimableReward.toString());
      });
    }

    return { balances, claimableRewards };
  }

  private async getStakedTokens(addresses: Address[], multicall, pools) {
    const calls = new Map<string, ICallData>();

    addresses.forEach((address) => {
      pools.items.forEach((pool) => {
        if (pool.poolId !== '331') {
          // 331 pool was broken and returning 'execution reverted' error
          calls.set(this.balanceOfLabel(pool.address, address, pool.poolId), {
            address: pool.address,
            abi: Abis.stakedWantTokens,
            input: {
              data: [pool.poolId, address],
            },
            output: {},
          });
        }
      });
    });

    const mapEntries = Array.from(calls.entries());
    const chunk = 1500;
    const promises = [];
    for (let i = 0; i < calls.size; i += chunk) {
      const sliceCalls = mapEntries.slice(i, i + chunk);
      promises.push(multicall.handleInBatches(new Map(sliceCalls.flatMap((call) => [call]))));
    }

    const promisesResp = await Promise.all(promises);
    return new Map<string, ICallData>(promisesResp.flatMap((resp) => Array.from(resp.entries())));
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

      if (Number(stakedBigNumber) <= 0.00001) return;

      stakingPosition.stakingToken.balance = stakedBigNumber.toNumber();

      if (stakingPosition.stakingToken.tokens?.length) {
        const poolShare = stakedBigNumber.div(stakingPosition.stakingToken.totalSupply);

        stakingPosition.stakingToken.tokens.forEach((t) => {
          t.balance = poolShare.times(new BigNumber(t.reserve)).toNumber();
          if (!Number.isFinite(t.balance)) t.balance = 0;
        });
      }

      if (stakingPosition.stakingToken.tokens.length === 0) {
        stakingPosition.stakingToken.value = Number(
          stakedBigNumber.times(new BigNumber(stakingPosition.stakingToken.price)),
        );
      }

      stakingPosition.staked = b.balance;

      // find and set claimable rewards:
      const claimableReward = claimableRewards.find(
        (cr) => cr.userAddress === b.user.id && cr.poolId === balancePoolId,
      );

      stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
      if (claimableReward) {
        stakingPosition.rewards[0].claimableData.balance = claimableReward.pendingAUTO
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      } else {
        stakingPosition.rewards?.forEach((reward) => {
          reward.claimableData.balance = 0;
        });
      }

      if (b.contract === this.masterChiefAddresses.get(ChainIdEnum.plg)) {
        stakingPosition.rewards[0].claimableData.balance = 0;
        stakingPosition.rewards[1].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[1].claimableData.balance = 0;
      }

      stakingPositions.push(stakingPosition);
    });

    return stakingPositions;
  }

  private pendingTokensLabel(address: string, contract: string, poolId: number) {
    return concatStrings(address, contract, poolId);
  }

  private balanceOfLabel(contract: string, userAddress: string, poolId: number) {
    return concatStrings(contract, userAddress, poolId);
  }
}
