import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';

import { ListQueryDto } from '../../../common/dto/ListQuery.dto';
import { PaginationResult } from '../../../common/dto/PaginationResult.dto';

import { LegacyAdapter } from '../adapters/legacy.adapter';
import { OpportunityDto } from '../dtos/opportunity.dto';
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

  async search(query: ListQueryDto): Promise<PaginationResult<OpportunityEntity>> {
    return this.opportunityRepository.search(query);
  }

  async sync(): Promise<SyncResult> {
    try {
      // TODO: Adapters Coming Soon
      const { count } = await this.opportunityAdapterService.runInOrder([
        // InternalAdapter,
        LegacyAdapter,
        // MultifarmAdapter,
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
