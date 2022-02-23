import { ApiProperty } from '@nestjs/swagger';

import { BaseEntityDto } from './base.entity.dto';
import { OpportunityDto } from './opportunity.dto';

export class FarmDto extends BaseEntityDto {
  @ApiProperty({ type: Number, example: 'Curve' })
  name: string;

  @ApiProperty({ type: String, example: 'https://curve.fi/' })
  url: string;

  @ApiProperty({ type: Boolean, example: true })
  isEnabled: boolean;

  @ApiProperty({ type: [OpportunityDto] })
  opportunities: OpportunityDto[];
}
