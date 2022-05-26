import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { ChainDto, Address, FeatureEnum, SundaeProtocolEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { SundaeSwapSubgraph } from '../../../subgraphs/subgraphs/sundaeswap.subgraph';
import { SUNDAE_REWARDS_TOKEN } from '../../helpers/cardano/cardano.constants';
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

    const sundae = await this.cardanoUtils.getTokenInfo(SUNDAE_REWARDS_TOKEN);

    for (const address of addresses) {
      const farms: Staked[] = await this.sundaeSwapSubgraph.getAccountFarms(address);
      const mapFarms = this.transformFarmArrayToMap(farms);

      for (const [poolId, staking] of mapFarms.entries()) {
        const poolPosition = pools.get(poolId);
        if (!poolPosition) continue;
        const stakingBalance = staking.reduce((prev, stacked) => prev + +stacked.quantity, 0);
        poolPosition.stats.share = this.cardanoUtils.calculatePoolShare(
          stakingBalance,
          poolPosition,
        );

        const stackingItem = plainToClass(IntegrationStakingPositionDto, poolPosition);
        stackingItem.stakingToken = poolPosition.lpToken;
        stackingItem.stakingToken.tokens = this.cardanoUtils.mapTokens(poolPosition);
        stackingItem.rewards = [];

        for (const reward of staking) {
          stackingItem.rewards.push({
            price: sundae.price,
            address: sundae.address,
            symbol: sundae.symbol,
            name: sundae.name,
            decimals: sundae.decimals,
            claimableData: {
              balance: toDecimals(reward.earned, sundae.decimals),
              value: new BigNumber(toDecimals(reward.earned, sundae.decimals)) //
                .times(sundae.price)
                .toNumber(),
              nextRewardAt: reward.nextRewardAt.format,
            },
          });
        }

        stackingItem.stats.poolApy = staking[0].pool.apr;
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
