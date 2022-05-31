import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { Address, ChainDto, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { MinswapSubgraph } from '../../../subgraph/subgraphs/minswap.subgraph';
import { MIN_REWARDS_TOKEN } from '../../helpers/cardano/cardano.constants';
import { CardanoService } from '../../helpers/cardano/cardano.service';

@Injectable()
export class MinswapFarms {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly minswapSubgraph: MinswapSubgraph,
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
      addresses.map((address) => [
        address,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.staking,
          projectName: ProjectEnum.minswap,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    const min = await this.cardanoUtils.getTokenInfo(MIN_REWARDS_TOKEN);

    for (const address of addresses) {
      const farms = await this.minswapSubgraph.getAccountFarms(address);

      for (const farm of farms) {
        const lpAddress = farm.lpAsset.currencySymbol + farm.lpAsset.tokenName;
        if (pools.has(lpAddress) && farm.liquidityStaking > 0) {
          const poolPosition = pools.get(lpAddress);

          const stakingBalance = farm.liquidityStaking;
          const stackingItem = plainToClass(IntegrationStakingPositionDto, poolPosition);

          poolPosition.stats.share = this.cardanoUtils.calculatePoolShare(
            stakingBalance,
            poolPosition,
          );
          stackingItem.stakingToken = poolPosition.lpToken;
          stackingItem.stakingToken.tokens = this.cardanoUtils.mapTokens(poolPosition);

          stackingItem.rewards[0] = {
            price: min.price,
            address: min.address,
            symbol: min.symbol,
            name: min.name,
            decimals: min.decimals,
            claimableData: {
              balance: toDecimals(farm.pendingReward, min.decimals),
              value: new BigNumber(toDecimals(farm.pendingReward, min.decimals)) //
                .times(min.price)
                .toNumber(),
            },
          };

          baseDataStakingMap.get(address).items.push(this.cardanoUtils.cleanUpItem(stackingItem));
        }
      }
    }

    return Array.from(baseDataStakingMap.values());
  }
}
