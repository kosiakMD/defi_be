import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ChainIdEnum,
  CurveProtocolEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../common/utils/util';

import { StakingDataInterface, UnderlyingTokenDto } from '../ellipsis/ellipsis.staking';
import { Abis } from './abis';
import { CurveMulticall } from './curve.multicall';

@Injectable()
export class CurveStaking {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3ProviderService,
    private readonly multicallAggregator: MulticallAggregator,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${CurveProtocolEnum.curve}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const localMultiCall = new CurveMulticall(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.web3Provider.getInstanceByChainId(chain.id),
      this.logger,
    );
    const balances = await this.getStakingBalances(addresses, cachedPools.items, chain);
    const rewards =
      chain.id === ChainIdEnum.eth
        ? await localMultiCall.getUserRewardsBalances(balances)
        : await this.getNonEthRewards(balances, chain);
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
        stakingPosition.rewards.forEach((reward) => {
          const rewardRaw =
            reward.address === CurveAddresses.crvToken
              ? gaugeRewards.crvReward
              : gaugeRewards.additionalRewards?.shift();
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

  modifyUnderlyingToken(token: UnderlyingTokenDto, poolShare: string) {
    token.price = null;
    token.value = null;
    token.reserve = token.balance;
    token.balance = new BigNumber(poolShare) //
      .multipliedBy(token.reserve)
      .toNumber();
  }

  getClaimableRewardWriteLabel(address: string, tokenAddress: string, gauge: string) {
    return concatStrings(address, tokenAddress, gauge);
  }

  private async getStakingBalances(
    addresses: string[],
    pools: IntegrationStakingPositionDto[],
    chain: ChainDto,
  ) {
    try {
      const calls = new Map();
      const poolsMap = new Map();
      let index = 0;
      addresses.forEach((address) => {
        pools.forEach((pool) => {
          const contract = new Abis(pool.address);
          calls.set(concatStrings(address, pool.address), contract.balanceOf(address));
          if (index !== pools.length) poolsMap.set(pool.address, pool);
          index++;
        });
      });

      const result = await this.multicallAggregator.handleInBatches(calls, chain.id);
      const balanceMap = new Map<string, StakingDataInterface[]>();
      result.forEach((value, key) => {
        const balance = value.output.data;
        if (!balance.isZero()) {
          const [address, poolAddr] = key.split('_');
          const pool = poolsMap.get(poolAddr);
          const stakingData = {
            stakingBalance: toDecimals(balance.toString(), pool.stakingToken.decimals),
            stakingPosition: JSON.parse(JSON.stringify(pool)),
          };
          const mapItem = balanceMap.get(address);
          mapItem ? mapItem.push(stakingData) : balanceMap.set(address, [stakingData]);
        }
      });
      return balanceMap;
    } catch (e) {
      this.logger.error(e, 'getStakingBalances');
    }
  }

  private async getNonEthRewards(
    balanceItemsMap: Map<string, StakingDataInterface[]>,
    chain: ChainDto,
  ) {
    try {
      const calls = new Map();
      balanceItemsMap.forEach((value, key) => {
        value.forEach((stakingData) => {
          const contract = new Abis(stakingData.stakingPosition.address);
          stakingData.stakingPosition.rewards.forEach((reward) => {
            calls.set(
              this.getClaimableRewardWriteLabel(
                key,
                reward.address,
                stakingData.stakingPosition.address,
              ),
              contract.claimableRewardWrite(key, reward.address),
            );
          });
        });
      });

      const multicallResp = await this.multicallAggregator.handleInBatches(calls, chain.id);
      const resultMap = new Map();
      balanceItemsMap.forEach((value, key) => {
        const rewardsMap = new Map();
        value.forEach((stakingData) => {
          const additionalRewards = [];
          stakingData.stakingPosition.rewards.forEach((reward) => {
            additionalRewards.push(
              multicallResp
                .get(
                  this.getClaimableRewardWriteLabel(
                    key,
                    reward.address,
                    stakingData.stakingPosition.address,
                  ),
                )
                ?.output.data.toString(),
            );
          });
          rewardsMap.set(stakingData.stakingPosition.address, { additionalRewards });
        });
        resultMap.set(key, rewardsMap);
      });
      return resultMap;
    } catch (e) {
      this.logger.error(e, 'getNonEthRewards');
    }
  }
}
