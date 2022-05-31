import { toDecimals } from 'apps/integration/src/common/utils/util';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { ChainDto, Address, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BalanceData, BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationERC20TokenDto } from '@app/common/jobs/staking';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

@Injectable()
export class OsmosisLocked {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly httpService: HttpService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto, protocol: string): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${protocol}_${FeatureEnum.pools}`;
    const cachedPools: NotifyPools = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const baseData: BaseDataLocked[] = [];
    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    for (const address of addresses) {
      const baseInfo: BaseDataLocked = plainToClass(BaseDataLocked, {
        chain,
        projectName: ProjectEnum.osmosis,
        protocolName: protocol,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.lockedBalances,
        items: [],
      });

      const lockedBalance = await this.getLockedBalances(address);

      for (const locked of lockedBalance) {
        if (!pools.get(locked.denom)) continue;
        const lockedPool = pools.get(locked.denom);

        const decimalsAmount = toDecimals(locked.amount, lockedPool.lpToken.decimals);
        const lockedPrice =
          lockedPool.tokens.reduce((prev, token) => token.reserve * token.price + prev, 0) /
          lockedPool.lpToken.totalSupply;
        const share = decimalsAmount / lockedPool.lpToken.totalSupply;

        const lockedToken = plainToClass(LockedToken, {
          price: lockedPrice,
          address: lockedPool.address,
          name: lockedPool.name,
          symbol: lockedPool.lpToken.symbol,
          decimals: lockedPool.lpToken.decimals,
          tokens: lockedPool.tokens.map((token) =>
            plainToClass(IntegrationERC20TokenDto, {
              ...token,
              balance: token.reserve * share,
              value: token.balance * token.price,
            }),
          ),
          locked: plainToClass(BalanceData, { balance: decimalsAmount }),
        });

        baseInfo.items.push(lockedToken);
      }

      baseData.push(baseInfo);
    }

    return baseData;
  }

  private async getLockedBalances(address: string): Promise<{ denom: string; amount: string }[]> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        'https://lcd-osmosis.keplr.app/osmosis/lockup/v1beta1/account_locked_coins/' + address,
      ),
    );
    return data.coins;
  }
}
