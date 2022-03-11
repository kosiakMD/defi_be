import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  ChainDto,
  Address,
  FeatureEnum,
  SundaeProtocolEnum,
  ProtocolTypeEnum,
  ChainIdEnum,
  BalancesResponse,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { Asset } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { SundaeSwapSubgraph } from '../../../subgraphs/subgraphs/sundaeswap.subgraph';
import { SUNDAE_REWARDS_TOKEN } from './sundaeswap.constants';
import { Staked } from './sundaeswap.interface';
import {
  calculatePoolShare,
  cleanUpItem,
  getPoolAddresseAmount,
  mapTokens,
} from './sundaeswap.utils';

@Injectable()
export class SundaeSwapFarms {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly sundaeSwapSubgraph: SundaeSwapSubgraph,
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

    const lpBalances: BalancesResponse = await this.accountService.getBalancesPost(
      addresses,
      [chain.id],
      Array.from(pools.keys()),
    );

    const sundae = await this.getSundaeTokenInfo();

    for (const address of addresses) {
      const avaliblePoolAddresses = getPoolAddresseAmount(
        [address],
        lpBalances,
        Array.from(pools.keys()),
      );

      const farms: Staked[] = await this.sundaeSwapSubgraph.getAccountFarms(address);
      const mapFarms = this.transformFarmArrayToMap(farms);

      for (const [poolId, rewards] of mapFarms.entries()) {
        const poolPosition = pools.get(poolId);
        poolPosition.stats.share = calculatePoolShare(avaliblePoolAddresses, poolPosition);

        const stackingItem = plainToClass(IntegrationStakingPositionDto, poolPosition);
        stackingItem.stakingToken = poolPosition.lpToken;
        stackingItem.stakingToken.tokens = mapTokens(poolPosition, rewards[0].pool);
        stackingItem.rewards = [];

        for (const reward of rewards) {
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

        stackingItem.stats.poolApy = rewards[0].pool.apr;
        stackingItem.stats.tvl = poolPosition.stats.tvl;

        baseDataStakingMap.get(address).items.push(cleanUpItem(stackingItem));
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

  private async getSundaeTokenInfo(): Promise<Asset & { price: number }> {
    const result = await Promise.all([
      this.priceService.getTokenPrices([SUNDAE_REWARDS_TOKEN], ChainIdEnum.cardano),
      this.accountService.getAssets([SUNDAE_REWARDS_TOKEN], [ChainIdEnum.cardano]),
    ]);

    const sundaePrice = result[0].prices[SUNDAE_REWARDS_TOKEN];
    const sundaeInfo = result[1].data[0];

    return { ...sundaeInfo, price: sundaePrice };
  }
}
