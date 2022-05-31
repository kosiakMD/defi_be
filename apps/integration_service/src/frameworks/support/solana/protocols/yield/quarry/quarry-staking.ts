/* eslint-disable max-classes-per-file */
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { Cache } from 'cache-manager';
import { filter, firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../../modules/microservices/price.service';
import { IRootProtocol, TokenMap } from '../../../../interfaces';
import { IStakingFeatureUserEntry } from '../../../../interfaces/feature-staking.interface';
import { QUARRY_QUARRY_LAYOUT } from '../../../schemas/quarry';
import { SolanaCoreSonarTemplate } from '../../../solana-core-sonar-template';
import {
  IQuarryMeta,
  IQuarryOpportunityResponse,
  IQuarryProtocol,
  IQuarryStakingFeatureMinimal,
  IQuarryStakingFeatureOpportunity,
} from './interfaces';
import { fetchYieldsMerge, fetchYieldsQuarry } from './yields-quarry';

export class QuarryStaking
  extends SolanaCoreSonarTemplate<
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

  LIMIT_DATA = 100;

  async getCacheableOpportunityData(): Promise<IQuarryStakingFeatureMinimal[]> {
    const $data = this.httpService.get<IQuarryOpportunityResponse>(this.meta.context.endpoint).pipe(
      mergeMap((response) => Object.values(response.data)),
      filter((protocol) => protocol.quarries.length > 0),
      mergeMap((protocol) => this.toFeatureEntryMinimal(protocol)),
      toArray(),
    );

    return firstValueFrom($data);
  }

  async getUsersData(
    addresses: string[],
  ): Promise<{ data: Map<string, IStakingFeatureUserEntry[]>; errors: Error[] }> {
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

  protected async updateRealTimeData(
    opportunities: IQuarryStakingFeatureMinimal[],
  ): Promise<IQuarryStakingFeatureMinimal[]> {
    const keys = opportunities.map((opportunity) => new PublicKey(opportunity.id));
    const accountsInfo = await this.accountContractsInformation(keys);

    for (let i = 0; i < accountsInfo.length; i++) {
      const account = QUARRY_QUARRY_LAYOUT.decode(accountsInfo[i].data);
      const opportunity = opportunities[i];
      opportunity.supplied[0].totalSupplied = account.totalTokensDeposited.toString();

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
    tokens: TokenMap,
  ): IQuarryStakingFeatureOpportunity {
    const token = tokens.get(opportunity.id);

    const base: any = {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      links: this.generateLinks(opportunity),
      token: this.formatOpportunityReceiptToken(opportunity, tokens.get(opportunity.id), tokens),
    };

    if ('supplied' in opportunity) {
      if (!tokens.has(opportunity.id)) {
        return;
      }

      base.supplied = opportunity.supplied?.map((poolToken) =>
        this.formatOpportunitySuppliedToken(poolToken, token),
      );
    }

    if ('rewarded' in opportunity) {
      if (!opportunity.rewarded.every((t) => tokens.has(t.token.address))) {
        return;
      }
      base.rewarded = opportunity.rewarded?.map((poolToken) =>
        this.formatOpportunityRewardedToken(
          poolToken,
          tokens.get(poolToken.token.address),
          token.value,
        ),
      );
    }
    if ('extra' in opportunity) {
      base.extra = opportunity.extra;
      base.replicaMint = opportunity.replicaMint;
    }

    return base;
  }

  private toFeatureEntryMinimal(protocol: IQuarryProtocol): IQuarryStakingFeatureMinimal[] {
    const quarries: IQuarryStakingFeatureMinimal[] = [];

    for (const quarry of protocol.quarries) {
      const rewardToken = quarry?.rewardsToken?.mint || protocol?.info?.redeemer?.underlyingToken;
      if (!rewardToken) continue;
      quarries.push({
        id: quarry.quarry,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [{ token: { address: quarry.stakedToken.mint } }],
        rewarded: [
          {
            token: {
              address: rewardToken,
            },
          },
        ],
        extra: {
          isParent: !quarry.isReplica,
        },
        replicaMint: quarry.replicaMint,
      });

      if (quarry.replicaQuarries.length > 0) {
        for (const replica of quarry.replicaQuarries) {
          quarries.push({
            id: replica.quarry,
            chain: this.meta.chain,
            feature: this.meta.feature,
            supplied: [{ token: { address: quarry.stakedToken.mint } }],
            rewarded: [{ token: { address: replica.rewardsToken.mint } }],
            extra: { isParent: false },
            replicaMint: quarry.replicaMint,
          });
        }
      }
    }
    return quarries;
  }

  private async accountContractsInformation(keys: PublicKey[]): Promise<AccountInfo<Buffer>[]> {
    const chunked = toChunkedArray(keys, this.LIMIT_DATA);
    const connection = this.web3Service.getInstanceByChainId(this.meta.chain);
    const accountsInfoRaw = await Promise.all(
      chunked.flatMap((keys) => connection.getMultipleAccountsInfo(keys)),
    );

    return accountsInfoRaw.flat();
  }
}
