import { ProtocolDataDto } from '@app/common';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';

import { FarmEntity } from '../entities/farm.entity';

export type LegacyFetchOpportunityOptions = {
  include: FarmEntity[];
  protocols: ProtocolDataDto[];
};

export type AdapterOptions = {
  processed: FarmEntity[];
};

export type AdapterResults = {
  farms: FarmEntity[];
  opportunities: OpportunityCreateDto[];
};
