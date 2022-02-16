import { AddressProviderFromJson, columbus5 } from '@anchor-protocol/anchor.js';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AnchorProtocolEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { Web3ProviderService } from '@app/common/web3provider';

import { toDecimals } from '../../../../common/utils/util';

import { StakingDataInterface, UnderlyingTokenDto } from '../ellipsis/ellipsis.staking';

@Injectable()
export class AnchorStaking {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3ProviderService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${AnchorProtocolEnum.anchor}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }

    const balances = await this.getStakingBalances(addresses, cachedPools.items, chain);

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.anchor,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    balances?.forEach((value, key) => {
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
        stakingPosition.rewards.forEach((reward) => {
          const claimable = stakingData.claimableReward?.find(
            (rew) => rew.rewardToken === reward.address,
          );
          reward.claimableData = {
            balance: Number(claimable?.rewardValue ?? 0),
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

  private async getStakingBalances(
    addresses: string[],
    pools: IntegrationStakingPositionDto[],
    chain: ChainDto,
  ) {
    try {
      const addressProvider = new AddressProviderFromJson(columbus5);
      const terra = this.web3Provider.getInstanceByChainId(chain.id);
      const { creator } = await terra.wasm.contractInfo(addressProvider.ancUstPair());
      // eslint-disable-next-line camelcase
      const { generator_address } = await terra.wasm.contractQuery(creator, { config: {} });
      const balanceMap = new Map<string, StakingDataInterface[]>();
      await Promise.all(
        addresses.map(async (address) => {
          await Promise.all(
            pools.map(async (pool) => {
              let stakingData;
              if (pool.stakingToken.tokens?.length) {
                // eslint-disable-next-line camelcase
                const [lpStakingBalance, { pending, pending_on_proxy }] = await Promise.all([
                  await terra.wasm.contractQuery(generator_address, {
                    deposit: {
                      // eslint-disable-next-line camelcase
                      lp_token: pool.stakingToken.address,
                      user: address,
                    },
                  }),
                  await terra.wasm.contractQuery(generator_address, {
                    // eslint-disable-next-line camelcase
                    pending_token: {
                      // eslint-disable-next-line camelcase
                      lp_token: pool.stakingToken.address,
                      user: address,
                    },
                  }),
                ]);

                stakingData = {
                  stakingBalance: toDecimals(lpStakingBalance, pool.stakingToken.decimals),
                  stakingPosition: JSON.parse(JSON.stringify(pool)),
                  claimableReward: pool.rewards.map((reward) => {
                    return {
                      rewardToken: reward.address,
                      rewardValue:
                        reward.address === addressProvider.ANC()
                          ? toDecimals(pending_on_proxy, reward.decimals)
                          : toDecimals(pending, reward.decimals),
                    };
                  }),
                };
              } else {
                const { balance } = await terra.wasm.contractQuery(addressProvider.gov(), {
                  staker: {
                    address: address,
                  },
                });

                stakingData = {
                  stakingBalance: toDecimals(balance, pool.stakingToken.decimals),
                  stakingPosition: JSON.parse(JSON.stringify(pool)),
                };
              }

              if (Number(stakingData.stakingBalance) > 0) {
                const mapItem = balanceMap.get(address);
                mapItem ? mapItem.push(stakingData) : balanceMap.set(address, [stakingData]);
              }
            }),
          );
        }),
      );

      return balanceMap;
    } catch (e) {
      this.logger.error(e, 'getStakingBalances');
    }
  }
}
