import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainDto, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { WRT_POOL_CONTRACT_HASH, WRT_REWARDS_TOKEN } from '../../helpers/cardano/cardano.constants';
import { CardanoService } from '../../helpers/cardano/cardano.service';
import { IFarmingRewards, IUtxo } from './wingriders.interfaces';

@Injectable()
export class WingRidersFarms {
  private readonly explorerApi: string;
  private readonly aggregatorApi: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly cardanoUtils: CardanoService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.explorerApi = this.configService.get('WING_RIDERS_EXPLORER_URL');
    this.aggregatorApi = this.configService.get('WING_RIDERS_AGGREGATOR_URL');
  }

  public async getData(
    addresses: string[],
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
          projectName: ProjectEnum.wingriders,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const pools = new Map<string, LiquidityPoolFeature>(
      cachedPools.items.map((item) => [item.address, item]),
    );

    const wrt = await this.cardanoUtils.getTokenInfo(WRT_REWARDS_TOKEN);

    for await (const address of baseDataStakingMap.keys()) {
      const stakingItems = baseDataStakingMap.get(address).items;
      const farmingRewards = new Map<string, IFarmingRewards>(
        (await this.fetchUserFarmingRewards(address)).map((rewardPool) => [
          rewardPool.poolId,
          rewardPool,
        ]),
      );

      (await this.fetchUtxoBy(address)).forEach((utxo) => {
        utxo.cuCoins.getTokens.forEach((stakedLpToken) => {
          const pool = pools.get(`${stakedLpToken.policyId}${stakedLpToken.assetName}`);
          const farmingReward = farmingRewards.get(stakedLpToken.assetName);

          pool.stats.share = +stakedLpToken.quantity / +pool.lpToken.totalSupply;

          if (pool) {
            stakingItems.push({
              address: pool.address,
              poolId: null,
              poolName: pool.name,
              rewards: [
                {
                  address: wrt.address,
                  decimals: wrt.decimals,
                  name: wrt.name,
                  symbol: wrt.symbol,
                  price: wrt.price,
                  totalSupply: +wrt.totalSupply,
                  claimableData: {
                    balance:
                      toDecimals(farmingReward?.tokenBundle[0]?.quantity, wrt.decimals) || null,
                    value: null,
                  },
                },
              ],
              staked: stakedLpToken.quantity,
              stakingToken: {
                ...pool.lpToken,
                tokens: this.cardanoUtils.mapTokens(pool),
              },
              stats: { poolApy: null, tvl: pool.stats.tvl },
            });
          }
        });
      });
    }

    return Array.from(baseDataStakingMap.values());
  }

  private async fetchUtxoBy(address: string): Promise<IUtxo[]> {
    const url = `${this.explorerApi}/api/bulk/payment-credentials/utxo`;
    const data = {
      limit: 500,
      paymentCredentials: [WRT_POOL_CONTRACT_HASH],
      datumPaths: [
        {
          path: '{constructor}',
          value: 0,
        },
        {
          path: '{fields,0,bytes}',
          op: 'eq',
          value: this.cardanoUtils.addressToBlake224(address),
        },
      ],
    };

    return await firstValueFrom(this.httpService.post(url, data).pipe(map((res) => res.data)));
  }

  private async fetchUserFarmingRewards(address: string): Promise<IFarmingRewards[]> {
    const url = `${this.aggregatorApi}/userFarming-rewards`;
    const data = {
      ownerPubKeyHashHex: this.cardanoUtils.addressToBlake224(address),
    };

    return await firstValueFrom(this.httpService.post(url, data).pipe(map((res) => res.data)));
  }
}
