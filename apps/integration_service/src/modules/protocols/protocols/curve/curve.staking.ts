import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  CurveProtocolEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { CurveAddresses } from '@app/common/constant/addresses';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { UnderlyingTokenDto } from '../ellipsis/ellipsis.staking';
import { CurveMulticall } from './curve.multicall';

@Injectable()
export class CurveStaking {
  private readonly multicall: MulticallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly multicallProvider: MulticallProvider,
    private readonly web3Provider: Web3ProviderService,
  ) {
    this.multicall = multicallProvider.getForChain(ChainAbbrEnum.bsc);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${CurveProtocolEnum.curve}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const localMultiCall = new CurveMulticall(
      this.web3Provider.getInstanceByChainId(chain.id),
      this.logger,
    );
    const balances = await localMultiCall.getUserBalances(addresses, cachedPools.items);
    const rewards = await localMultiCall.getUserRewardsBalances(balances);
    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.curve,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    balances.forEach((value, key) => {
      const userRewards = rewards.get(key);
      const staking = baseDataStakingMap.get(key);
      value.forEach((stakingData) => {
        const stakingBalance = stakingData.stakingBalance;
        const {
          stakingPosition,
          stakingPosition: { stakingToken },
        } = stakingData;
        stakingPosition.staked = String(stakingBalance);
        if (stakingToken.tokens.length) {
          const poolShare = new BigNumber(stakingBalance) //
            .div(stakingToken.totalSupply)
            .toString();
          stakingToken.tokens.forEach((token) => {
            this.modifyUnderlyingToken(token, poolShare);
            if (token.tokens?.length) {
              token.tokens.forEach((underlying) => {
                this.modifyUnderlyingToken(underlying, poolShare);
              });
            }
          });
        } else {
          stakingPosition.stakingToken = {
            ...stakingPosition.stakingToken,
            balance: stakingBalance,
            price: null,
            value: null,
          };
        }
        const gaugeRewards = userRewards.get(stakingPosition.address);
        stakingPosition.rewards.forEach((reward, index) => {
          const rewardRaw =
            reward.address === CurveAddresses.crvToken
              ? gaugeRewards.crvReward
              : gaugeRewards.additionalRewards[index - 1];
          reward.claimableData = {
            balance: toDecimals(rewardRaw, reward.decimals),
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
}
