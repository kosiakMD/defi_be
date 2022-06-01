import { ApiProperty } from '@nestjs/swagger';

import { OpportunityDto } from './opportunity.dto';

export class OpportunityListDto {
  @ApiProperty({ type: [OpportunityDto] })
  items: OpportunityDto[];
}
