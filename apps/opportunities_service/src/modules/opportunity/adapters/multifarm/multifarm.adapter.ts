import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { DepositTokenDto } from '@app/common/dto/opportunities/deposit.token.dto';
import { FarmCreateDto } from '@app/common/dto/opportunities/farm.create.dto';
import { InvestmentTokensDto } from '@app/common/dto/opportunities/investment.tokens.dto';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';
import { RewardTokenDto } from '@app/common/dto/opportunities/reward.token.dto';
import { retry } from '@app/common/utils';

import { FarmEntity } from '../../entities/farm.entity';
import { IOpportunityAdapter } from '../../interfaces/opportunity.adapter.interface';
import { FarmRepository } from '../../repositories/farm.repository';
import { AdapterOptions, AdapterResults } from '../../types/opportunity.adapter.types';
import { MultifarmGraphqlService } from './multifarm.graphql.service';
import { MultifarmAsset, MultifarmQueryPageOptions } from './multifarm.interfaces';

@Injectable()
export class MultifarmAdapter implements IOpportunityAdapter {
  constructor(
    private readonly config: ConfigService,
    private readonly subgraph: MultifarmGraphqlService,
    @InjectRepository(FarmRepository)
    private readonly farmRepository: FarmRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async loadData(options: AdapterOptions): Promise<AdapterResults> {
    const rawData = await this.queryMultifarmAssets(options.processed);
    const farms = await this.getFarms(rawData);
    const opportunities = this.parseData(farms, rawData);
    return { farms, opportunities };
  }

  private async queryMultifarmAssets(farms: FarmEntity[]): Promise<MultifarmAsset[]> {
    const options: MultifarmQueryPageOptions = {
      farmNames: farms.map((farm) => farm.name),
      hardcodedSkipped: ['Spooky', 'Aave'],
      found: 0,
      total: 0,
      offset: 0,
      consecutivePageSkips: 0,
      limit: 20, // this is the maximum their api support currently
      opportunities: [],
    };
    do {
      if (options.total) {
        this.logger.debug(
          `Fetching Page ${options.offset / options.limit + 1}/${options.total / 20}`,
        );
      } else {
        this.logger.debug(`Fetching Page ${options.offset / options.limit + 1}`);
      }
      try {
        await retry(
          async () => {
            try {
              await this.attemptNextMultifarmPage(options);
            } catch (e: any) {
              this.logger.debug(`Retrying Page ${options.offset / options.limit + 1}`);
              throw e;
            }
          },
          1500,
          1,
        );
      } catch {
        // Give up and save what we have, no matter the cause
        this.logger.debug(`Skipping Page ${options.offset / options.limit + 1}`);
        options.offset += options.limit;
        options.found += options.limit; // skip this page worths
        if (++options.consecutivePageSkips > 5) {
          this.logger.debug('Aborting due to too many errors');
          // Too many consecutive errors, just quit early
          break;
        }
      }
    } while (options.found < options.total);
    return options.opportunities;
  }

  private async attemptNextMultifarmPage(options: MultifarmQueryPageOptions) {
    const data = await this.subgraph.getAssets(
      options.farmNames.concat(options.hardcodedSkipped),
      options.offset,
      options.limit,
    );
    if ('errors' in data) {
      this.logger.debug(data.errors);
      throw new Error('GraphQL Error');
    }
    options.opportunities.push(...data.data.getAssets.assets);
    options.offset += options.limit;
    options.found += data.data.getAssets.assets.length;
    options.total = data.data.getAssets.pageMeta.total;
    options.consecutivePageSkips = 0; // reset counter since everything went fine
  }

  private async getFarms(rawData: MultifarmAsset[]): Promise<FarmEntity[]> {
    const farmCreateMap = new Map();
    rawData.forEach((opportunity) => {
      farmCreateMap.set(
        opportunity.farm.trim(),
        plainToClass(FarmCreateDto, {
          name: opportunity.farm.trim(),
          url: opportunity.url.trim(),
        }),
      );
    });

    const farms = await this.farmRepository.findAllByName(Array.from(farmCreateMap.keys()));
    farms.forEach((farm) => {
      farmCreateMap.delete(farm.name);
    });

    if (farmCreateMap.size) {
      farms.push(...(await this.farmRepository.insertMany(Array.from(farmCreateMap.values()))));
    }
    return farms;
  }

  private parseData(farms: FarmEntity[], opportunities: MultifarmAsset[]): OpportunityCreateDto[] {
    const opportunitiesSet = new Set<OpportunityCreateDto>();

    const farmMap = new Map(farms.map((f) => [f.name, f]));

    opportunities.forEach((opportunity) => {
      const chainId = this.lookupChain(opportunity.blockchain);
      if (!chainId) return;

      opportunitiesSet.add(
        plainToClass(OpportunityCreateDto, {
          farm: farmMap.get(opportunity.farm.trim()),
          source: 'multifarm',
          sourceId: opportunity.assetId,
          chainId: chainId,
          apr: opportunity.aprYearly,
          apy: opportunity.apyYearly,
          investmentUrl: opportunity.stakingLink,
          totalValueLocked: opportunity.tvlStaked,
          tokens: plainToClass(InvestmentTokensDto, {
            rewards: this.getRewardTokens(opportunity),
            deposit: this.getDepositToken(opportunity),
          }),
        }),
      );
    });

    return Array.from(opportunitiesSet);
  }

  lookupChain(chain: string): ChainIdEnum {
    const lookupTable = {
      ETH: ChainIdEnum.eth,
      FANTOM: ChainIdEnum.ftm,
      HECO: ChainIdEnum.heco,
      POLYGON: ChainIdEnum.plg,
      HARMONY: ChainIdEnum.harm,
      BSC: ChainIdEnum.bnb,
      AVAX: ChainIdEnum.avax,
      OKEX: ChainIdEnum.okex,
      CELO: ChainIdEnum.celo,
      ARBITRUM: ChainIdEnum.arbi,
      MOONRIVER: ChainIdEnum.mriver,
      SOL: ChainIdEnum.sol,
      CRONOS: ChainIdEnum.cro,
      KUCOIN: ChainIdEnum.kcc,
      BOBA: ChainIdEnum.boba,
      FUSE: ChainIdEnum.fuse,
    };

    if (lookupTable[chain]) {
      return lookupTable[chain];
    }

    return null;
  }

  getRewardTokens(opportunity: any): RewardTokenDto[] {
    const tokens = [];

    if (opportunity.rewardTokenA) {
      tokens.push(
        plainToClass(RewardTokenDto, {
          symbol: opportunity.rewardTokenA,
          address: opportunity.rewardTokenAAddress || null,
        }),
      );
    }
    if (opportunity.rewardTokenB) {
      tokens.push(
        plainToClass(RewardTokenDto, {
          symbol: opportunity.rewardTokenB,
          address: opportunity.rewardTokenBAddress || null,
        }),
      );
    }

    return tokens;
  }

  getDepositToken(opportunity: any): DepositTokenDto {
    const token = plainToClass(DepositTokenDto, {
      address: opportunity.asseassetAddresst,
      symbol: opportunity.asset,
      tokens: [],
    });

    // Single Stake
    if (opportunity.tokenA === opportunity.asset) {
      return token;
    }

    if (opportunity.tokenA) {
      token.tokens.push(
        plainToClass(DepositTokenDto, {
          address: opportunity.tokenAAddress,
          symbol: opportunity.tokenA,
        }),
      );
    }

    if (opportunity.tokenB) {
      token.tokens.push(
        plainToClass(DepositTokenDto, {
          address: opportunity.tokenBAddress,
          symbol: opportunity.tokenB,
        }),
      );
    }

    if (opportunity.tokenC) {
      token.tokens.push(
        plainToClass(DepositTokenDto, {
          address: opportunity.tokenCAddress,
          symbol: opportunity.tokenC,
        }),
      );
    }

    if (opportunity.tokenD) {
      token.tokens.push(
        plainToClass(DepositTokenDto, {
          address: opportunity.tokenDAddress,
          symbol: opportunity.tokenD,
        }),
      );
    }

    return token;
  }
}
