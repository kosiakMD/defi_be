import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';
import { PaginationResult } from '@app/common/dto/PaginationResult.dto';
import { OpportunitySearchQueryDto } from '@app/common/dto/opportunities/OpportunitySearchQuery.dto';
import { OpportunityDto } from '@app/common/dto/opportunities/opportunity.dto';

import { LegacyAdapter } from '../adapters/legacy.adapter';
import { MultifarmAdapter } from '../adapters/multifarm/multifarm.adapter';
import { OpportunityEntity } from '../entities/opportunity.entity';
import { SyncResult } from '../interfaces/sync.result.interface';
import { OpportunityRepository } from '../repositories/opportunity.repository';
import { OpportunityAdapterService } from './opportunity.adapter.service';

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(OpportunityRepository)
    private readonly opportunityRepository: OpportunityRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private readonly opportunityAdapterService: OpportunityAdapterService,
  ) {}

  async find(opportunityId: number): Promise<OpportunityDto> {
    return this.opportunityRepository.findItem(opportunityId);
  }

  async search(query: OpportunitySearchQueryDto): Promise<PaginationResult<OpportunityEntity>> {
    return this.opportunityRepository.search(query);
  }

  async sync(): Promise<SyncResult> {
    try {
      // TODO: Adapters Coming Soon
      const { count } = await this.opportunityAdapterService.runInOrder([
        // InternalAdapter,
        LegacyAdapter,
        MultifarmAdapter,
        // CoinDixAdapter,
        // VFatAdapter
      ]);

      return { success: true, count };
    } catch (e) {
      this.logger.error(e, 'OpportunityService.sync');
      return { success: false, count: 0, error: e.message };
    }
  }
}
