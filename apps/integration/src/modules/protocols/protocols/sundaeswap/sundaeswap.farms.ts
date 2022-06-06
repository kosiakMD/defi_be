import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { ChainDto, Address, FeatureEnum, SundaeProtocolEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import {
  IntegrationStakingPositionDto,
  IntegrationSundaeClaimableTokenDto,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { SundaeSwapSubgraph } from '../../../subgraphs/subgraphs/sundaeswap.subgraph';
import {
  CLAP_REWARDS_TOKEN,
  NMKR_REWARDS_TOKEN,
  SUNDAE_REWARDS_TOKEN,
  WMT_REWARDS_TOKEN,
  YUMMI_REWARDS_TOKEN,
} from '../../helpers/cardano/cardano.constants';
import { Staked } from '../../helpers/cardano/cardano.interface';
import { CardanoService } from '../../helpers/cardano/cardano.service';

@Injectable()
export class SundaeSwapFarms {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly sundaeSwapSubgraph: SundaeSwapSubgraph,
    private readonly cardanoUtils: CardanoService,
  ) {}

  public async getData(
    addresses: Address[],
    chain: ChainDto,
    protocol: string,
  ): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocol}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
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
          projectName: SundaeProtocolEnum.sundaeswap,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    const rewardTokens = await this.cardanoUtils.getTokenInfo([
      SUNDAE_REWARDS_TOKEN,
      WMT_REWARDS_TOKEN,
      YUMMI_REWARDS_TOKEN,
      CLAP_REWARDS_TOKEN,
      NMKR_REWARDS_TOKEN,
    ]);

    for (const address of addresses) {
      const farms: Staked[] = await this.sundaeSwapSubgraph.getAccountFarms(address);
      const mapFarms = this.transformFarmArrayToMap(farms);

      for (const [poolId, farms] of mapFarms.entries()) {
        const poolPosition = pools.get(poolId);
        if (!poolPosition) continue;
        const stakingBalance = farms.reduce((prev, stacked) => prev + +stacked.quantity, 0);
        poolPosition.stats.share = this.cardanoUtils.calculatePoolShare(
          stakingBalance,
          poolPosition,
        );

        const stackingItem = plainToClass(IntegrationStakingPositionDto, poolPosition);
        stackingItem.stakingToken = poolPosition.lpToken;
        stackingItem.stakingToken.tokens = this.cardanoUtils.mapTokens(poolPosition);
        stackingItem.rewards = [];

        for (const position of farms) {
          const currentRewards: [string, number][] = position.rewards.map((r) => {
            return [r.asset.assetId, +r.quantity];
          });
          const poolShare = new BN(
            normalizeDecimals(position.quantity, poolPosition.lpToken.decimals),
          ).div(poolPosition.lpToken.totalSupply);

          const sundaeSwapStakingRewardPosition: IntegrationSundaeClaimableTokenDto = {
            tokens: poolPosition.tokens.map((token) => {
              const balance = poolShare.times(token.reserve);
              const value = balance.times(token.price);
              return {
                ...token,
                balance: balance.toNumber(),
                value: value.toNumber(),
              };
            }),
            nextRewardAt: position.nextRewardAt.format,
            rewards: currentRewards
              .map(([assetId, earned]) => {
                const token = rewardTokens.get(assetId.replace(/\./, ''));
                if (!token) return;
                const claimableToken: any = {
                  ...token,
                  claimableData: {
                    balance: normalizeDecimals(earned.toString(), token.decimals),
                    value: normalizeDecimals(earned.toString(), token.decimals) * token.price,
                  },
                };
                return claimableToken;
              })
              .filter(Boolean),
          };
          stackingItem.sundaeRewards.push(sundaeSwapStakingRewardPosition);
        }

        stackingItem.stats.poolApy = farms[0].pool.apr;
        stackingItem.stats.tvl = poolPosition.stats.tvl;

        baseDataStakingMap.get(address).items.push(this.cardanoUtils.cleanUpItem(stackingItem));
      }
    }

    return Array.from(baseDataStakingMap.values());
  }

  private transformFarmArrayToMap(farms: Staked[]): Map<string, Staked[]> {
    const mapFarms = new Map<string, Staked[]>();

    for (const farm of farms) {
      if (mapFarms.has(farm.assetID)) {
        mapFarms.get(farm.assetID).push(farm);
      } else {
        mapFarms.set(farm.assetID, [farm]);
      }
    }

    return mapFarms;
  }
}
