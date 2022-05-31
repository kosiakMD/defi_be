/* eslint-disable max-classes-per-file */
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
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
import { LidoSchema } from '../../schemas/lido';
import { SolanaCore } from '../../solana-core';

export interface ILidoSolanaMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  address: Address;
  context: {
    program: Address;
    stakedToken: Address;
    statsApi: string;
    statsProcessor: (data: any) => number;
  };
}

export class LidoStaking
  extends SolanaCore<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    ILidoSolanaMeta
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

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimal[],
  ): Promise<IStakingFeatureMinimal[]> {
    const accountInfo = await this.getAccountInfo(this.meta.context.program);
    const exchangeRate = this.getExchangeRateFromAccountInfo(accountInfo);
    const apr = await this.getStats();

    opportunities[0].meta = { exchangeRate, apr };

    opportunities[0].supplied[0].totalSupplied = await this.getTotalStaked(exchangeRate);

    return opportunities;
  }

  protected formatOpportunity(
    opportunity: IStakingFeatureMinimal,
    tokens: Map<string, any>,
  ): void | IStakingFeatureOpportunity {
    const token = tokens.get(opportunity.supplied[0].token.address);

    const totalSupplied = normalizeDecimals(opportunity.supplied[0].totalSupplied, token.decimals);
    const tvl = totalSupplied * token.price;
    const apr = {
      day: opportunity.meta.apr / 365,
      week: opportunity.meta.apr / 52,
      month: opportunity.meta.apr / 12,
      year: opportunity.meta.apr,
    };

    return {
      id: opportunity.id,
      chain: opportunity.chain,
      feature: opportunity.feature,
      meta: opportunity.meta,
      supplied: [
        {
          token: token,
          tvl,
          totalSupplied,
        },
      ],
      rewarded: [
        {
          token: token,
          apr: apr,
          apy: apr, // apy is effectively the same as we can't compound
          harvests: {
            day: (apr.day * tvl) / token.price,
            week: (apr.week * tvl) / token.price,
            month: (apr.month * tvl) / token.price,
            year: (apr.year * tvl) / token.price,
          },
        },
      ],
    };
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
        const data = pools.reduce((acc: any[], pool: any) => {
          const userToken = balances[address].tokens.find((t: any) => t.token.address === pool.id);

          if (!userToken) return acc;

          const supplied = pool.supplied.map((token) => {
            const balance = userToken ? userToken.decimalsAmount * pool.meta.exchangeRate : 0;
            token.amount = balance;
            token.value = balance * token.token.price;
            return {
              ...token,
              amount: balance,
              value: balance * token.token.price,
            };
          });

          const rewarded = pool.rewarded.map((token) => {
            return {
              ...token,
              amount: 0,
              value: 0,
            };
          });

          acc.push({ ...pool, supplied, rewarded });

          return acc;
        }, []);

        wallets.set(address, data);
      });
    } catch (err) {
      errors.push(err);
    }

    return { data: wallets, errors };
  }

  protected async getStats() {
    const { data } = await firstValueFrom(this.httpService.get(this.meta.context.statsApi));
    return this.meta.context.statsProcessor(data);
  }

  protected async getAccountInfo(address: string) {
    const connection = this.web3Service.getInstanceByChainId(this.meta.chain);
    const accountInfo = await connection.getAccountInfo(new PublicKey(address));
    return LidoSchema.decode(accountInfo.data);
  }

  protected getExchangeRateFromAccountInfo(accountInfo) {
    // Fetch SOL and stSOL balance
    const totalSolInLamports = accountInfo.exchange_rate.sol_balance.toNumber();
    const totalStSolSupplyInLamports = accountInfo.exchange_rate.st_sol_supply.toNumber();
    // Calculate the stSOL/sOL exchange rate
    return totalSolInLamports / totalStSolSupplyInLamports;
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
