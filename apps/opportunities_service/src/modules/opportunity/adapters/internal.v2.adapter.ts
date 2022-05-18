import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, ProtocolDataDto } from '@app/common';
import { DepositTokenDto } from '@app/common/dto/opportunities/deposit.token.dto';
import { FarmCreateDto } from '@app/common/dto/opportunities/farm.create.dto';
import { InvestmentTokensDto } from '@app/common/dto/opportunities/investment.tokens.dto';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';
import { RewardTokenDto } from '@app/common/dto/opportunities/reward.token.dto';
import { VaultTypeEnum } from '@app/common/enum/opportunities/opportunity.enums';
import { aprToApy, apyToApr } from '@app/common/utils';

import { IntegrationService } from '../../microservices/integration.service';
import { FarmEntity } from '../entities/farm.entity';
import { IOpportunityAdapter } from '../interfaces/opportunity.adapter.interface';
import { FarmRepository } from '../repositories/farm.repository';
import { AdapterResults, FetchV2OpportunityOptions } from '../types/opportunity.adapter.types';

@Injectable()
export class InternalV2Adapter implements IOpportunityAdapter {
  constructor(
    private readonly integrationService: IntegrationService,
    @InjectRepository(FarmRepository)
    private readonly farmRepository: FarmRepository,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    //
  }

  async loadData(): Promise<AdapterResults> {
    // fetches supported farms, saves each to database if required, returns db entities
    const { farms, protocols } = await this.loadFarms();

    const opportunities: OpportunityCreateDto[] = await this.fetchOpportunitiesForFarms({
      // fetches remote opportunities from adapter for requested farms
      // fetches remote data
      include: farms,
      protocols,
    });

    return { farms, opportunities };
  }

  /**
   * Loads all supported farms from our database. (fetches from remote where required)
   *
   * @returns FarmEntity[]
   */
  private async loadFarms(): Promise<{ farms: FarmEntity[]; protocols: ProtocolDataDto[] }> {
    const protocols = await this.integrationService.getV2ProtocolList();

    const protocolNames = new Set(protocols.map((p) => p.name));
    const farms = await this.farmRepository.findAllByName(Array.from(protocolNames));
    const farmMap = new Map(farms.map((f) => [f.name, f]));

    const missing = [];
    protocolNames.forEach((name) => {
      if (!farmMap.has(name)) {
        // This adapter doesn't contain URL so we leave blank for now
        missing.push(plainToClass(FarmCreateDto, { name, url: '' }));
      }
    });

    const missed = await this.farmRepository.insertMany(missing);

    return {
      farms: [].concat(farms, missed),
      protocols,
    };
  }

  /**
   * Creates savable entities for every available opportunity
   *
   * @param options
   * @returns Opportunities
   */
  private async fetchOpportunitiesForFarms({
    include,
    protocols,
  }: FetchV2OpportunityOptions): Promise<OpportunityCreateDto[]> {
    const included = new Map(include.map((f) => [f.name, f]));
    const opportunities = await this.getOpportunitiesFromProtocols(included, protocols);

    // return formatted opportunities, ready to save
    return opportunities;
  }

  private async getOpportunitiesFromProtocols(
    included: Map<string, FarmEntity>,
    protocols: ProtocolDataDto[],
  ) {
    const opportunities = [];
    const promises = protocols.map(async (protocol) => {
      // Ensure its not a farm that has already been processed in another adapter
      if (!included.has(protocol.name)) {
        return;
      }

      const farm = included.get(protocol.name);

      await Promise.all(
        protocol.features.map(async (features) => {
          await Promise.all(
            features.list.map(async (feature) => {
              const cacheKey = features.chain.id + '_' + protocol.name + '_' + feature;
              const cachedItems = await this.getCachedData(cacheKey);

              await Promise.all(
                cachedItems.map(async (item) => {
                  const storedAPR =
                    item.rewards?.reduce((total, reward) => total + (reward?.apr ?? 0), 0) / 100 ||
                    null;
                  const storedAPY = (item.stats.poolApy ?? item.stats.apy) / 100 || null;

                  const apr = storedAPR || (storedAPY ? apyToApr(storedAPY) : null);
                  const apy = storedAPY || (storedAPR ? aprToApy(storedAPR) : null);

                  const opportunity = plainToClass(OpportunityCreateDto, {
                    farm: farm,
                    source: 'internal_v2',
                    sourceId: cacheKey,
                    chainId: features.chain.id,
                    apr,
                    apy,
                    investmentUrl: null,
                    totalValueLocked: item.stats.tvl,
                    categories: this.getVaultCategories(item),
                    tokens: plainToClass(InvestmentTokensDto, {
                      rewards: this.getRewardTokens(item),
                      deposit: this.getDepositToken(item),
                    }),
                  });

                  if (apr) {
                    opportunities.push(opportunity);
                  }
                }),
              );
            }),
          );
        }),
      );
    }, []);

    await Promise.all(promises);
    return opportunities;
  }

  private async getCachedData(cacheKey: string): Promise<any[]> {
    // TODO: remove <any>, but there are many possible types cached from vaults service
    // and its difficult to track down correctly all possible variations
    const data = await this.cache.get<any>(cacheKey);
    return data?.items || [];
  }

  /*****
   * Formatting Tokens
   */

  private getRewardTokens(item: any) {
    if (!item?.rewards?.length) return [];

    return item.rewards.reduce((acc: RewardTokenDto[], reward: any) => {
      if (!reward?.address) return acc;

      acc.push(
        plainToClass(RewardTokenDto, {
          address: reward.address,
          symbol: reward.symbol,
          name: reward.name,
        }),
      );
      return acc;
    }, []);
  }

  private getDepositToken(item: any) {
    const baseToken = item.lpToken || item.stakingToken;
    const underlyingTokens = item.tokens || item.stakingToken?.tokens;

    const tvl = underlyingTokens?.length
      ? underlyingTokens.reduce((acc, cur) => acc + cur.reserve * cur.price, 0)
      : item.stats.tvl || baseToken.price * baseToken.totalSupply;

    return plainToClass(DepositTokenDto, {
      address: baseToken.address,
      symbol: baseToken.symbol,
      name: baseToken.name,
      tokens: underlyingTokens?.map((token) => {
        const total = token.reserve * token.price;
        return plainToClass(DepositTokenDto, {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          weight: Math.round((total / tvl) * 1000) / 1000,
        });
      }),
    });
  }

  /*****
   * Categorization
   */

  private vaultIsPool(vault: any) {
    const tokens = vault.stakingToken?.tokens ?? vault.tokens;
    if (Array.isArray(tokens)) {
      return tokens.length >= 2;
    }
    return false;
  }
  private vaultIsSingleStake(vault: any) {
    const tokens = vault.stakingToken?.tokens ?? vault.tokens;
    if (Array.isArray(tokens)) {
      return tokens.length < 2;
    }
    return true;
  }
  private getVaultCategories(vault: unknown) {
    const categories = new Set<VaultTypeEnum>();
    if (this.vaultIsPool(vault)) {
      categories.add(VaultTypeEnum.POOL);
    }

    if (this.vaultIsSingleStake(vault)) {
      categories.add(VaultTypeEnum.SINGLE_STAKE);
    }

    return Array.from(categories);
  }
}
