import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, ProtocolDataDto } from '@app/common';

import { IntegrationService } from '../../microservices/integration.service';
import { DepositTokenDto } from '../dtos/deposit.token.dto';
import { FarmCreateDto } from '../dtos/farm.create.dto';
import { InvestmentTokensDto } from '../dtos/investment.tokens.dto';
import { OpportunityCreateDto } from '../dtos/opportunity.create.dto';
import { RewardTokenDto } from '../dtos/reward.token.dto';
import { FarmEntity } from '../entities/farm.entity';
import { IOpportunityAdapter } from '../interfaces/opportunity.adapter.interface';
import { FarmRepository } from '../repositories/farm.repository';
import { AdapterResults, LegacyFetchOpportunityOptions } from '../types/opportunity.adapter.types';

@Injectable()
export class LegacyAdapter implements IOpportunityAdapter {
  constructor(
    private readonly integrationService: IntegrationService,
    @InjectRepository(FarmRepository)
    private readonly farmRepository: FarmRepository,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

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
    const protocols = await this.integrationService.getAllFeatures();

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
  }: LegacyFetchOpportunityOptions): Promise<OpportunityCreateDto[]> {
    const included = new Map(include.map((f) => [f.name, f]));
    const opportunities = await this.getOpportunitiesFromProtocols(included, protocols);

    // return formatted opportunities, ready to save
    return opportunities;
  }

  private async getOpportunitiesFromProtocols(included, protocols) {
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
                  const apr =
                    item.rewards?.reduce((total, reward) => total + (reward?.apr ?? 0), 0) || null;
                  const apy = item.stats.poolApy ?? item.stats.apy ?? null;

                  opportunities.push(
                    plainToClass(OpportunityCreateDto, {
                      farm: farm,
                      source: 'legacy',
                      sourceId: cacheKey,
                      chainId: features.chain.id,
                      apr,
                      apy,
                      investmentUrl: null,
                      totalValueLocked: item.stats.tvl,
                      tokens: plainToClass(InvestmentTokensDto, {
                        rewards: this.getRewardTokens(item),
                        deposit: this.getDepositToken(item),
                      }),
                    }),
                  );
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

  private getRewardTokens(item: any) {
    if (!item?.rewards?.length) return [];

    return item.rewards.reduce((acc: RewardTokenDto[], reward: any) => {
      if (!reward?.address) return acc;

      acc.push(
        plainToClass(RewardTokenDto, {
          address: reward.address,
          name: reward.name,
          symbol: reward.symbol,
          decimals: reward.decimals,
          totalSupply: reward.totalSupply,
        }),
      );
      return acc;
    }, []);
  }

  private getDepositToken(item: any) {
    if (item.stakingToken) {
      return plainToClass(DepositTokenDto, {
        address: item.stakingToken.address,
        name: item.stakingToken.name,
        symbol: item.stakingToken.symbol,
        decimals: item.stakingToken.decimals,
        totalSupply: item.stakingToken.totalSupply,
        tokens: item.stakingToken.tokens?.map((token) =>
          plainToClass(DepositTokenDto, {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            totalSupply: token.totalSupply,
          }),
        ),
      });
    }

    if (item.lpToken) {
      return plainToClass(DepositTokenDto, {
        address: item.lpToken.address,
        name: item.lpToken.name,
        symbol: item.lpToken.symbol,
        decimals: item.lpToken.decimals,
        totalSupply: item.lpToken.totalSupply,
        tokens: item.tokens.map((token) =>
          plainToClass(DepositTokenDto, {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            totalSupply: token.totalSupply,
          }),
        ),
      });
    }
  }
}
