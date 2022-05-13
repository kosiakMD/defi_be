/* eslint-disable max-classes-per-file */
import { PublicKey } from '@solana/web3.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../../modules/microservices/price.service';
import { IRootProtocol, IUserDataProtocolResponse } from '../../../../interfaces';
import { IStakingFeatureUserEntry } from '../../../../interfaces/feature.staking.interface';
import { QUARRY_QUARRY_LAYOUT } from '../../../Schemas/Quarry';
import { SolanaCore } from '../../../SolanaCore';
import { fetchYieldsMerge, fetchYieldsQuarry } from './YieldsQuarry';
import {
  IQuarryMeta,
  IQuarryStakingFeatureMinimal,
  IQuarryStakingFeatureOpportunity,
  IQuarryOpportunityResponse,
} from './interfaces';
import { calculateAPR, mapReserveResponse } from './quarry.utils';

export class QuarryStaking
  extends SolanaCore<
    IQuarryStakingFeatureMinimal,
    IQuarryStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IQuarryMeta
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
  solRPC: string = this.configService.get<string>('SOL_URL');
  LIMIT_DATA: number;

  async initialize(): Promise<void> {
    this.LIMIT_DATA = 100;
  }

  /**
   * @todo need to find a way to generate a list of quarry data and not use static file since its unsafe
   */
  async getCacheableOpportunityData(): Promise<IQuarryStakingFeatureMinimal[]> {
    const $data = this.httpService.get<IQuarryOpportunityResponse[]>(this.meta.api.endpoint).pipe(
      mergeMap((response) => response.data),
      map((pool) => this.toFeatureEntryMinimal(pool)),
      toArray(),
    );

    const opportunities = await firstValueFrom($data);

    return this.totalDeposited(opportunities);
  }

  protected async totalDeposited(
    opportunities: IQuarryStakingFeatureMinimal[],
  ): Promise<IQuarryStakingFeatureMinimal[]> {
    const connection = this.web3Service.getInstanceByChainId(this.meta.chain);

    const keys = opportunities.map((opportunity) => new PublicKey(opportunity.id));
    const reserveKeys = opportunities
      .flatMap((opportunity) => {
        return opportunity.supplied[0].token.underlying.map((token) => {
          return token.reserveAddress;
        });
      })
      .filter(Boolean);

    const chunked = toChunkedArray(keys, this.LIMIT_DATA);
    const reserveChunked = toChunkedArray(Array.from(new Set(reserveKeys)), this.LIMIT_DATA);

    const accountsInfoRaw = await Promise.all(
      chunked.flatMap((keys) => connection.getMultipleAccountsInfo(keys)),
    );

    const reserveInfoRaw = await Promise.all(
      reserveChunked.flatMap((keys) => this.getAccountInfo(keys)),
    );

    const reserves = mapReserveResponse(reserveInfoRaw.flat());

    const accountsInfo = accountsInfoRaw.flat();
    for (let i = 0; i < accountsInfo.length; i++) {
      const account = QUARRY_QUARRY_LAYOUT.decode(accountsInfo[i].data);
      const opportunity = opportunities[i];
      opportunity.supplied[0].totalSupplied = account.totalTokensDeposited.toString();

      opportunity.supplied[0].token.underlying.forEach((token) => {
        if (token.reserveAddress) {
          token.reserve = reserves.get(token.reserveAddress);
        }
        return token;
      });

      opportunity.extra = {
        isParent: opportunity.extra.isParent,
        famineTs: account.famineTs.toString(),
        lastUpdateTs: account.lastUpdateTs.toString(),
        annualRewardsRate: account.annualRewardsRate.toString(),
        rewardsPerTokenStored: account.rewardsPerTokenStored.toString(),
        totalTokensDeposited: account.totalTokensDeposited.toString(),
      };
    }

    return opportunities;
  }

  protected formatOpportunity(
    opportunity: IQuarryStakingFeatureMinimal,
    tokens: Map<string, any>,
  ): IQuarryStakingFeatureOpportunity {
    const supplied = opportunity.supplied[0];
    const token = tokens.get(supplied.token.address);
    const underlying = supplied.token.underlying.map(({ address, reserve }) => {
      const token = tokens.get(address);
      const tokenReserve = reserve || token.reserve;
      return {
        ...token,
        reserve: tokenReserve,
      };
    });
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);

    const tvl = underlying.reduce((p, n) => n.reserve * n.price + p, 0);

    if (!token.price) {
      token.price = tvl / totalSupplied || 0;
    }

    const apr = calculateAPR(opportunity, tokens);

    const aprByPeriods = {
      day: apr / 365,
      week: apr / 52,
      month: apr / 12,
      year: apr,
    };

    const rewarded = opportunity.rewarded.map((reward) => {
      return {
        token: tokens.get(reward.token.address),
        harvests: {
          day: (aprByPeriods.day * tvl) / token.price,
          week: (aprByPeriods.week * tvl) / token.price,
          month: (aprByPeriods.month * tvl) / token.price,
          year: (aprByPeriods.year * tvl) / token.price,
        },
        apr: aprByPeriods,
        apy: aprByPeriods,
      };
    });

    return {
      id: opportunity.id,
      chain: opportunity.chain,
      feature: opportunity.feature,
      meta: opportunity.meta,
      extra: opportunity.extra,
      replicaMint: opportunity.replicaMint,
      supplied: [
        {
          token: { ...token, underlying },
          tvl: tvl,
          totalSupplied,
          totalSupply: +token.totalSupply,
        },
      ],
      rewarded: rewarded,
    };
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<IStakingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const wallets = new Map();
    try {
      const connection = this.web3Service.getInstanceByChainId(this.meta.chain);
      const poolFarms = new Map(pools.map((pool) => [pool.id, pool]));

      for (const address of addresses) {
        const publicKey = new PublicKey(address);
        const data = await Promise.all([
          fetchYieldsQuarry(connection, publicKey, poolFarms),
          fetchYieldsMerge(connection, publicKey, poolFarms),
        ]);

        wallets.set(address, data.flat());
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: wallets, errors };
  }

  private toFeatureEntryMinimal(farm: IQuarryOpportunityResponse): IQuarryStakingFeatureMinimal {
    return {
      id: farm.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      extra: {
        isParent: farm.isParent,
      },
      rewarded: farm.rewardAssets.map((token) => {
        return {
          token: { address: token },
          rewardPerSecond: '0',
        };
      }),

      supplied: [
        {
          token: {
            address: farm.stakedToken,
            underlying: farm.assets,
          },
          totalSupplied: '0',
        },
      ],
      replicaMint: farm.replicaMint,
    };
  }

  private getAccountInfo(keys: string[]) {
    const config = {
      jsonrpc: '2.0',
      method: 'getAccountInfo',
      encoding: 'jsonParsed',
    };

    const body = keys.map((key) => {
      return {
        jsonrpc: config.jsonrpc,
        id: key,
        method: config.method,
        params: [key, { encoding: config.encoding }],
      };
    });

    const $data = this.httpService.post(this.solRPC, body).pipe(map((r) => r.data));
    return firstValueFrom($data);
  }
}
