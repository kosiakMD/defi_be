import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ClaimableDto,
  ICallData,
  Logger,
  ProtocolNameEnum,
  ChainIdEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  AutofarmProtocolEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { MulticallProvider } from '../../../chain/multicall.provider';
import { MulticallService } from '../../../chain/multicall.service';
import { PriceService } from '../../../microservices/price.service';
import { decimalsDivider } from '../../../utils/util';
import { Abis } from '../autofarm/abis';

@Injectable()
export class AutofarmStaking {
  private readonly masterChiefAddresses = {
    [ChainIdEnum.bsc]: '0x0895196562c7868c5be92459fae7f877ed450452',
    [ChainIdEnum.plg]: '0x89d065572136814230a55ddeeddec9df34eb0b76'
  }
  private readonly badAddress = '0x000000000000000000000000000000000000dead';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
  ) {

  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${AutofarmProtocolEnum.autofarm}_${FeatureEnum.staking}`;
    
    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }
    
    const multicall: MulticallService = this.multicallProvider.getForChain(chain.abbr);
    const masterContract: string = this.masterChiefAddresses[chain.id];

    addresses = addresses.map(a => a.toLowerCase());

    const base: BaseDataStaking[] = [];
    
    const multicallData = await this.getDataWithMulticall(
      addresses,
      multicall,
      masterContract,
      pools
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

      const userStakingPositions: IntegrationStakingPositionDto[] = this.getStakingPositionsForAddress(userMulticallData, pools);

      baseInfo.items.push(...userStakingPositions);
      base.push(baseInfo);
    }

    return base;
  }

  private async getDataWithMulticall(addresses: Address[], multicall, contract, pools) {
    let calls = new Map<string, ICallData>();

    for (const address of addresses) {
      for (let pool of pools.items) {
        if (pool.address !== this.badAddress) {
          calls.set(this.balanceOfLabel(contract, address, pool.poolId), {
            address: contract,
            abi: Abis.stakedWantTokens,
            input: {
              data: [pool.poolId, address],
            },
            output: {},
          });
        }
      }
    }

    let poolsWithBalance = [];
    const userInfos: Map<string, ICallData> = await multicall.handleInBatches(calls);

    for (const userInfo of userInfos.entries()) {
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
      contract: string,
      poolId: number;
      pendingAUTO?: BigNumber;
      userAddress: string;
      pendingBonusToken?: BigNumber;
      bonusTokenAddress?: string
    }[] = [];

    if (contract === this.masterChiefAddresses[ChainIdEnum.bsc]) {
      balances.forEach((b) => {
        claimableRewards.push({
          contract: b.contract,
          poolId: Number(b.id.split('_')[2]),
          userAddress: b.user.id,
        });
      });
  
      const pendingTokensCalls = new Map<string, ICallData>();
      claimableRewards.map((d) => {
        pendingTokensCalls.set(this.pendingTokensLabel(d.userAddress, d.contract, d.poolId), {
          address: d.contract,
          abi: Abis.pendingAUTO,
          input: {
            data: [d.poolId, d.userAddress],
          },
          output: {},
        });
      });
      
      const claimableRewardsRsp: Map<string, ICallData> = await multicall.handleInBatches(pendingTokensCalls);
  
      claimableRewards.forEach((d, i) => {
        let claimableReward = claimableRewardsRsp.get(this.pendingTokensLabel(d.userAddress, d.contract, d.poolId)).output.data;
        claimableRewards[i].pendingAUTO = new BigNumber(claimableReward.toString());
      });
    }

    return { balances, claimableRewards }
  }

  private getMulticallDataForAddress(multicallData, userAddress: string) {
    const balances = multicallData.balances.filter(b => b.user.id === userAddress);
    const claimableRewards = multicallData.claimableRewards.filter(r => r.userAddress === userAddress);

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
        const poolShare = stakedBigNumber.div(new BigNumber(stakingPosition.stakingToken.totalSupply));
        stakingPosition.stakingToken.tokens.forEach((clpt) => {
          clpt.balance = poolShare.times(new BigNumber(clpt.reserve)).toNumber();
        });
      }

      if (stakingPosition.stakingToken.tokens.length === 0) {
        stakingPosition.stakingToken.value = Number(stakedBigNumber.times(new BigNumber(stakingPosition.stakingToken.price)));
      }

      stakingPosition.staked = Number(b.balance);

      // find and set claimable rewards:
      const claimableReward = claimableRewards.find(
        (cr) => cr.userAddress === b.user.id && cr.poolId === balancePoolId,
      );

      if (claimableReward) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
        stakingPosition.rewards[0].claimableData.balance = claimableReward.pendingAUTO
          .div(decimalsDivider(stakingPosition.rewards[0].decimals))
          .toString();
      }

      if (b.contract === this.masterChiefAddresses[ChainIdEnum.plg]) {
        stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
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
