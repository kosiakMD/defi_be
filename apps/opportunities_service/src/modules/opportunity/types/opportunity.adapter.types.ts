import { ProtocolDataDto, ProtocolV3DataDto } from '@app/common';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';

import { FarmEntity } from '../entities/farm.entity';

export type FetchV2OpportunityOptions = {
  include: FarmEntity[];
  protocols: ProtocolDataDto[];
};

export type FetchV3OpportunityOptions = {
  include: FarmEntity[];
  protocols: ProtocolV3DataDto[];
};

export type AdapterOptions = {
  processed: FarmEntity[];
};

export type AdapterResults = {
  farms: FarmEntity[];
  opportunities: OpportunityCreateDto[];
};
