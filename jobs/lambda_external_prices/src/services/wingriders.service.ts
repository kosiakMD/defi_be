import cacheManager from 'cache-manager';
import * as redisStore from 'cache-manager-redis-store';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { PriceSourcePriority } from '@app/common/enum/price.enum';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';

import { redisCredentials } from '../config';
import { logger } from '../utils/logger';
import { CurrentPriceInterface } from './price.service';

export class WingRidersService {
  private readonly cacheKey = `${ChainIdEnum.cardano}_${ProtocolNameEnum.wingriders}_${FeatureEnum.pools}`;
  private readonly chainId = ChainIdEnum.cardano;
  private readonly currencyId = CurrencyIdEnum.usd;

  private readonly cache = cacheManager
    .caching({
      store: redisStore,
      ...redisCredentials,
    })
    .store.getClient();

  async getPrices(): Promise<CurrentPriceInterface[]> {
    const prices: CurrentPriceInterface[] = [];

    const cachedPools = () =>
      new Promise<LiquidityPoolFeature[]>((resolve) =>
        this.cache.get(this.cacheKey, (err, res) => {
          if (err) {
            logger.error(`Redis responds with an error with this [${this.cacheKey}] key:`, err);
          }
          const cachedPools: NotifyPools = JSON.parse(res);

          if (!cachedPools?.items.length) {
            logger.warn(`Not found cached pools for key [${this.cacheKey}]`);
          }

          resolve(cachedPools?.items || []);
        }),
      );

    const pools = await cachedPools();

    if (pools.length) {
      pools.forEach((pool) => {
        const adaToken = pool.tokens.find(this.isAdaToken);
        const pairToken = pool.tokens.find(this.isNotAdaToken);

        prices.push({
          address: pairToken.address,
          chainId: this.chainId,
          currencyId: this.currencyId,
          price: (adaToken.price * adaToken.reserve) / pairToken.reserve,
          sourceId: PriceSourcePriority.wingriders,
        });
      });
    }

    return prices;
  }

  private isAdaToken(token: PoolTokenDto): boolean {
    return token.address === CARDANO_COIN_ADDRESS;
  }

  private isNotAdaToken(token: PoolTokenDto): boolean {
    return token.address !== CARDANO_COIN_ADDRESS;
  }
}
