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
import { aprToApy } from '@app/common/utils';

import { IntegrationService } from '../../microservices/integration.service';
import { FarmEntity } from '../entities/farm.entity';
import { IOpportunityAdapter } from '../interfaces/opportunity.adapter.interface';
import { FarmRepository } from '../repositories/farm.repository';
import { AdapterResults, LegacyFetchOpportunityOptions } from '../types/opportunity.adapter.types';

@Injectable()
export class InternalV3Adapter implements IOpportunityAdapter {
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
    this.logger.time('V3 Adapter - Loading farms');
    const { farms, protocols } = await this.loadFarms();
    this.logger.timeEnd('V3 Adapter - Loading farms');

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
    const protocols = await this.integrationService.getV3ProtocolList();

    const farms = await this.farmRepository.findAllByName(
      Array.from(new Set(protocols.map((p) => p.project))),
    );
    const farmMap = new Map(farms.map((f) => [f.name, f]));

    const missing = [];
    const updating = [];
    protocols.forEach((protocol) => {
      const farm = farmMap.get(protocol.project);
      if (!farm) {
        missing.push(
          plainToClass(FarmCreateDto, { name: protocol.project, url: protocol.links.url ?? '' }),
        );
      } else if (farm.url !== protocol.links.url && protocol.links.url) {
        // update url if changed (likely hasn't)
        farm.url = protocol.links.url;
        updating.push(farm);
      }
    });

    await Promise.all(updating.map((farm) => this.farmRepository.update(farm.id, farm)));

    const missed = await this.farmRepository.insertMany(missing);

    return {
      farms: [].concat(farms, missed),
      protocols: protocols,
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

  private async getOpportunitiesFromProtocols(
    included: Map<string, FarmEntity>,
    protocols: ProtocolDataDto[],
  ): Promise<OpportunityCreateDto[]> {
    const opportunities: OpportunityCreateDto[] = [];
    const promises = protocols.map(async (protocol) => {
      this.logger.time(`V3 Adapter - Processing ${protocol.project}`);
      try {
        const farm = included.get(protocol.project);
        if (!farm) {
          this.logger.timeEnd(`V3 Adapter - Processing ${protocol.project}`);
          return;
        }

        const { items } = await this.integrationService.getV3ProtocolOpportunities(
          protocol.project,
          protocol.features.map(({ chain }) => chain.id),
        );

        items.map((item) => {
          // TODO: Handle Other Feature Types
          if (item.feature === 'staking') {
            const totalApr =
              'rewarded' in item ? item.rewarded.reduce((acc, r) => acc + r.apr.year, 0) : null;

            const opportunity = plainToClass(OpportunityCreateDto, {
              farm: farm,
              source: 'internal_v3',
              sourceId: item.id,
              chainId: item.chain,
              apr: totalApr,
              apy: aprToApy(totalApr),
              investmentUrl: item.links?.opportunity ?? null,
              totalValueLocked: item.supplied.reduce((acc, s) => acc + s.tvl, 0),
              categories: this.getVaultCategories(item),
              tokens: plainToClass(InvestmentTokensDto, {
                rewards: this.getRewardTokens(item),
                deposit: this.getDepositToken(item),
              }),
            });
            if (opportunity.apr) {
              opportunities.push(opportunity);
            }
          } else if (item.feature === 'lending') {
            let totalApr = 0;
            if ('supplied' in item) {
              // TODO: supplyApy is for AaveV3. Remove when reward DTO gets finalized
              totalApr += item.supplied.reduce(
                (acc, r) => acc + (r.apr?.year || r.apy?.supplyApy || 0),
                0,
              );
            }
            if ('rewarded' in item) {
              totalApr += item.rewarded.reduce((acc, r) => acc + (r.apr?.year || 0), 0);
            }

            const opportunity = plainToClass(OpportunityCreateDto, {
              farm: farm,
              source: 'internal_v3',
              sourceId: item.id,
              chainId: item.chain,
              apr: totalApr,
              apy: aprToApy(totalApr),
              investmentUrl: item.links?.opportunity ?? null,
              totalValueLocked: item.supplied.reduce((acc, s) => acc + s.tvl, 0),
              categories: this.getVaultCategories(item),
              tokens: plainToClass(InvestmentTokensDto, {
                rewards: this.getRewardTokens(item),
                deposit: this.getDepositToken(item),
              }),
            });

            if (opportunity.apr) {
              opportunities.push(opportunity);
            }
          }
        });
        this.logger.timeEnd(`V3 Adapter - Processing ${protocol.project}`);
      } catch (e) {
        this.logger.timeEnd(`V3 Adapter - Processing ${protocol.project}`);
        this.logger.error(`Failed in ${protocol.project}`, e.stack);
        return;
      }
    });

    await Promise.all(promises);

    return opportunities;
  }

  /*****
   * Formatting Tokens
   */

  private getRewardTokens(item: any) {
    if (!item?.rewarded?.length) return [];
    return item.rewarded.map((reward: any): RewardTokenDto => {
      return plainToClass(RewardTokenDto, {
        address: reward.token.address,
        symbol: reward.token.symbol,
        name: reward.token.name,
      });
    });
  }

  private getDepositToken(item: any) {
    // TODO: Update this to be an array of supplied tokens (LP tokens, etc)
    const suppliedToken = item.supplied[0];

    const tvl = item.supplied.reduce((acc, s) => acc + s.tvl, 0);

    return plainToClass(DepositTokenDto, {
      address: suppliedToken.token.address,
      symbol: suppliedToken.token.symbol,
      name: suppliedToken.token.name,
      tokens:
        suppliedToken.token.underlying?.map((token) => {
          const total = token.reserve * token.price;
          return plainToClass(DepositTokenDto, {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            ...(total && { weight: Math.round((total / tvl) * 1000) / 1000 }),
          });
        }) || [],
    });
  }

  /*****
   * Categorization: These are rough estimates and will be reviewed in the future
   * Currently tested only for staking features, which for the most part assumes
   * there is a single token in supplied. Will need to be updated to support lending
   * and multiple supply tokens
   */
  private vaultIsPool(item: any) {
    const tokens = item.supplied;
    // standard single token deposit, multiple underlying tokens (deposit LP on farm)
    if (tokens.length === 1 && tokens[0].token.underlying?.length >= 2) {
      return true;
    }

    // Liquidity Pools
    if (item.feature === 'pools') {
      return true;
    }

    return false;
  }
  private vaultIsSingleStake(item: any) {
    const hasZeroOrOneUnderlying =
      !item.supplied[0].token.underlying || item.supplied[0].token.underlying?.length < 2;
    // single deposit, no underlying
    if (item.supplied.length === 1 && hasZeroOrOneUnderlying) {
      return true;
    }

    return false;
  }
  private vaultIsLending(item: any) {
    if (item.feature === 'lending') {
      return true;
    }

    return false;
  }

  private getVaultCategories(item: any) {
    // TODO: IOpportunityResult type (not any)
    const categories = new Set<VaultTypeEnum>();
    if (this.vaultIsPool(item)) {
      categories.add(VaultTypeEnum.POOL);
    }

    if (this.vaultIsSingleStake(item)) {
      categories.add(VaultTypeEnum.SINGLE_STAKE);
    }

    if (this.vaultIsLending(item)) {
      categories.add(VaultTypeEnum.LENDING);
    }

    return Array.from(categories);
  }
}
