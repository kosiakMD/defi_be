import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta, IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { SolanaCore } from '../../SolanaCore';

export interface IMarinadeSolanaMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  address: Address;
  context: {
    stakedToken: Address;
    statsApi: string;
    statsProcessor: (data: Record<string, number>) => Record<string, number>;
  };
}
export class MarinadeStaking
  extends SolanaCore<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IMarinadeSolanaMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected web3Service: Web3SolanaProviderService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: this.meta.context.stakedToken },
            totalSupplied: '0', // calculated ofter we get the tokens //tokens.get(this.meta.address).totalSupply * exchangeRate,
          },
        ],
        rewarded: [
          {
            token: { address: this.meta.context.stakedToken },
            rewardPerSecond: '0', // calculated after we get tokens price
          },
        ],
      },
    ];
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<IStakingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const wallets = new Map();

    try {
      const balances = await this.accountService.getBalances(
        addresses,
        [ChainIdEnum.sol],
        pools.map((pool) => pool.id),
      );

      addresses.forEach((address) => {
        const data = pools.reduce(
          (acc: IStakingFeatureUserEntry[], pool: IStakingFeatureOpportunity) => {
            const userToken = balances[address].tokens.find((t) => t.token.address === pool.id);
            if (!userToken) return acc;

            const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((token) => {
              const balance = userToken ? userToken.decimalsAmount * pool.meta.exchangeRate : 0;
              return {
                ...token,
                amount: balance,
                value: balance * token.token.price,
              };
            });

            const rewarded: IRewardTokenUserEntry[] = pool.rewarded.map((token) => ({
              ...token,
              amount: 0,
              value: 0,
            }));

            acc.push({
              id: pool.id,
              chain: pool.chain,
              feature: pool.feature,
              rewarded,
              supplied,
            });

            return acc;
          },
          [],
        );

        wallets.set(address, data);
      });
    } catch (err) {
      errors.push(err);
    }

    return { data: wallets, errors };
  }

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimal[],
  ): Promise<IStakingFeatureMinimal[]> {
    const { exchangeRate, apr } = await this.getStats();

    opportunities[0].meta = { exchangeRate, apr };
    opportunities[0].supplied[0].totalSupplied = await this.getTotalStaked(exchangeRate);

    return opportunities;
  }

  protected async getStats() {
    const { data } = await firstValueFrom(this.httpService.get(this.meta.context.statsApi));
    return this.meta.context.statsProcessor(data);
  }

  protected async getTotalStaked(exchangeRate: number) {
    const { data } = await firstValueFrom(
      this.httpService.post(this.configService.get('SOL_URL'), {
        jsonrpc: '2.0',
        id: `${this.meta.address}_supply`,
        method: 'getTokenSupply',
        params: [this.meta.address],
      }),
    );

    return new BigNumber(data.result.value.amount) //
      .times(exchangeRate)
      .toString();
  }
}
