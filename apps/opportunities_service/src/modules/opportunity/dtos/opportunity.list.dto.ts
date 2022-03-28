import { ApiProperty } from '@nestjs/swagger';

import { OpportunityListInterface } from '@app/common/interfaces/OpportunityList.interface';

import { OpportunityDto } from './opportunity.dto';

export class OpportunityListDto implements OpportunityListInterface {
  @ApiProperty({ type: [OpportunityDto] })
  items: OpportunityDto[];
}
