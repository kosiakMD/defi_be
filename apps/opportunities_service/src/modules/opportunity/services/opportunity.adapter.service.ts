import { Inject, Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';

import { OpportunityCreateDto } from '../dtos/opportunity.create.dto';
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
      const adapter = await this.moduleRef.create(adapterClass);

      const { farms: localFarms, opportunities: localOpportunities } = await adapter.loadData({
        processed: farms,
      });

      farms.push(...localFarms);
      opportunities.push(...localOpportunities);
    }

    return await this.refreshOpportunities(opportunities);
  }

  async refreshOpportunities(opportunities: OpportunityCreateDto[]): Promise<any> {
    // this.beginTransaction
    this.logger.time('Replacing Database');
    const results = await this.opportunityRepository.replaceAll(opportunities);
    this.logger.timeEnd('Replacing Database');
    return results;
    // this.endTransaction
  }
}
