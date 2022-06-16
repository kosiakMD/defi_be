import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { AxiosRequestConfig } from 'axios';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';

import { RootProtocolCacheable } from '../../RootProtocolCacheable';
import { IProtocolMeta } from '../../interfaces';
import { BaseWithTokens } from '../../interfaces/new.interfaces';
import { IRewardTokenUserEntry } from '../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../interfaces/tokens.supplied.interface';

interface ValidatorInfo {
  address: string;
  name: string;
  website: string;
}
interface DelegationExtras {
  validator: ValidatorInfo;
}

type DelegationMinimal = BaseWithTokens<ISupplyTokenMinimal>;
type DelegationOpportunity = BaseWithTokens<ISupplyTokenOpportunity>;
type DelegationEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  DelegationExtras
>;

export class CardanoDelegation extends RootProtocolCacheable<
  DelegationMinimal,
  DelegationOpportunity,
  DelegationEntry,
  IProtocolMeta
> {
  private endpoint = `https://cardano-mainnet.blockfrost.io/api/v0`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
    protected readonly assetService: FakeAssetService,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super();
  }

  private get httpHeaders() {
    return {
      // eslint-disable-next-line camelcase
      project_id: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    };
  }

  async getCacheableOpportunityData(): Promise<DelegationMinimal[]> {
    return [
      {
        id: 'cardano-native-delegation',
        feature: FeatureEnum.delegation, // TODO: delegation?
        chain: ChainIdEnum.cardano,
        supply: { token: { address: CARDANO_COIN_ADDRESS } },
      },
    ];
  }

  async fetchUserData(
    address: Address,
    pools: DelegationOpportunity[],
  ): Promise<DelegationEntry[]> {
    // There is always exactly one
    const [pool] = pools;
    const { token } = pool.supply;
    const [stakeData, poolData] = await this.getFeatures(address);

    const balanceAmount = normalizeDecimals(stakeData.controlled_amount, token.decimals);
    const claimableRewardsAmount = normalizeDecimals(stakeData.rewards_sum, token.decimals);
    return [
      {
        ...pool,
        links: {
          opportunity: poolData.homepage, // validator website
        },
        supply: {
          token,
          tvl: 0,
          amount: balanceAmount,
          value: balanceAmount * token.price,
        },
        reward: {
          token,
          amount: claimableRewardsAmount,
          value: claimableRewardsAmount * token.price,
          apr: null,
          apy: null,
        },
        meta: {
          validator: {
            address: poolData.pool_id,
            name: poolData.name,
            website: poolData.homepage,
          },
        },
      },
    ];
  }

  private async getFeatures(address: string): Promise<any[]> {
    const getConfig = { headers: this.httpHeaders };

    return firstValueFrom(
      this.httpService
        .get<any>(`${this.endpoint}/addresses/${address}`, getConfig)
        .pipe(
          switchMap(({ data: addressResponse }) =>
            this.httpService
              .get<any>(`${this.endpoint}/accounts/${addressResponse.stake_address}`, getConfig)
              .pipe(
                switchMap(({ data: stakeData }) =>
                  this.httpService
                    .get<any>(`${this.endpoint}/pools/${stakeData.pool_id}/metadata`, getConfig)
                    .pipe(map(({ data: poolData }) => [stakeData, poolData])),
                ),
              ),
          ),
        ),
    );
  }

  private async get(url: string, config?: AxiosRequestConfig) {
    return firstValueFrom(this.httpService.get(url, config).pipe(map((a) => a.data)));
  }
}
