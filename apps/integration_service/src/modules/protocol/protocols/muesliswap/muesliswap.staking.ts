import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainDto, Address, FeatureEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { stringToHex } from '@app/common/utils';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { PriceService } from '../../../microservice/price.service';
import { MILK_REWARDS_TOKEN } from '../../helpers/cardano/cardano.constants';
import { CardanoService } from '../../helpers/cardano/cardano.service';
import {
  IMuesliSwapStakingPool,
  IMuesliSwapStakingRewards,
  IMuesliSwapTokenPrice,
} from './muesliswap.interfaces';

@Injectable()
export class MuesliSwapStaking {
  private readonly stakingHost: string;
  private readonly orderBookHost: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly priceService: PriceService,
    private readonly cardanoUtils: CardanoService,
  ) {
    this.stakingHost = this.config.get('MUESLI_SWAP_STAKING_URL');
    this.orderBookHost = this.config.get('MUESLI_SWAP_ORDERBOOK_URL');
  }

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const pools = new Map<string, IMuesliSwapStakingPool>(
      (await this.fetchStakingPools()).map((pool) => [pool.poolId, pool]),
    );

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

    const prices = (
      await this.priceService.getTokenPrices([MILK_REWARDS_TOKEN, CARDANO_COIN_ADDRESS], chain.id)
    ).prices;

    for await (const address of baseDataStakingMap.keys()) {
      const stakingItems = baseDataStakingMap.get(address).items;
      const stakingRewards = await this.fetchStakingRewardsBy(address);

      await Promise.all(
        stakingRewards.map(async (stakingReward) => {
          const pool = pools.get(stakingReward.pool_id);
          const rewardAddress = pool.rewardPolicyId + stringToHex(pool.rewardName);
          const rewardTokenPrice =
            (await this.fetchTokenPrice(pool.rewardPolicyId, pool.rewardName)).priceADA *
            prices[CARDANO_COIN_ADDRESS];

          stakingItems.push({
            address: rewardAddress,
            poolId: null,
            poolName: pool.rewardName,
            rewards: [
              {
                address: rewardAddress,
                decimals: pool.rewardDecimalPlaces,
                name: pool.rewardName,
                symbol: pool.rewardSymbol,
                claimableData: {
                  balance: stakingReward.reward,
                  value: +stakingReward.reward * rewardTokenPrice,
                },
              },
            ],
            staked: String(stakingReward.amount_staked),
            stakingToken: {
              address: pool.stakingPolicyId + stringToHex(pool.stakingName),
              decimals: pool.stakingDecimalPlaces,
              name: pool.stakingName,
              symbol: pool.stakingName,
              balance: +String(stakingReward.amount_staked),
              value: +String(stakingReward.amount_staked) * prices[MILK_REWARDS_TOKEN],
            },
            stats: { poolApy: 0, tvl: +pool.amountStaked * prices[MILK_REWARDS_TOKEN] },
          });
        }),
      );
    }

    return Array.from(baseDataStakingMap.values());
  }

  private async fetchStakingPools(): Promise<IMuesliSwapStakingPool[]> {
    return await firstValueFrom(
      this.httpService.get(`${this.stakingHost}/tokens-info`).pipe(map(({ data }) => data)),
    );
  }

  private async fetchStakingRewardsBy(address: string): Promise<IMuesliSwapStakingRewards[]> {
    return await firstValueFrom(
      this.httpService
        .get(`${this.stakingHost}/my-rewards`, {
          params: {
            pkh: this.cardanoUtils.addressToBlake224(address),
          },
        })
        .pipe(map(({ data }) => data)),
    );
  }

  private async fetchTokenPrice(
    policyId: string,
    assetName: string,
  ): Promise<IMuesliSwapTokenPrice> {
    return await firstValueFrom(
      this.httpService
        .get(`${this.orderBookHost}/token-price`, {
          params: {
            'policy-id': policyId,
            tokenname: assetName,
          },
        })
        .pipe(map(({ data }) => data)),
    );
  }
}
