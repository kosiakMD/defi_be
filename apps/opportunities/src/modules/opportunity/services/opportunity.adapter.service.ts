import { Inject, Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';

import { FarmEntity } from '../entities/farm.entity';
import { IOpportunityAdapter } from '../interfaces/opportunity.adapter.interface';
import { OpportunityRepository } from '../repositories/opportunity.repository';

@Injectable()
export class OpportunityAdapterService {
  constructor(
    @InjectRepository(OpportunityRepository)
    private readonly opportunityRepository: OpportunityRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private readonly moduleRef: ModuleRef,
  ) {}

  async runInOrder(adapters: Type<IOpportunityAdapter>[]): Promise<any> {
    const farms: FarmEntity[] = [];
    const opportunities: OpportunityCreateDto[] = [];

    // Run each adapter sync so that the next adapter has a chance
    // to skip all farms processed by a previous layer
    for (const adapterClass of adapters) {
      this.logger.time(`Processing ${adapterClass.name}`);
      const adapter = await this.moduleRef.create(adapterClass);

      const { farms: localFarms, opportunities: localOpportunities } = await adapter.loadData({
        processed: farms,
      });

      farms.push(...localFarms);
      opportunities.push(...localOpportunities);
      this.logger.timeEnd(`Processing ${adapterClass.name}`);
      this.logger.log(
        `Processing ${adapterClass.name}. found: ${localFarms.length} Farms & ${localOpportunities.length} Opportunities`,
      );
    }
    if (opportunities.length) {
      return await this.refreshOpportunities(opportunities);
    } else {
      this.logger.warn('Failed to find any opportunities. Skipping');
      return [];
    }
  }

  async refreshOpportunities(opportunities: OpportunityCreateDto[]): Promise<any> {
    return this.opportunityRepository.replaceAll(opportunities);
  }
}
