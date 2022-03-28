import { ApiProperty } from '@nestjs/swagger';

import { FarmInterface } from '@app/common/interfaces/Farm.Interface';

import { BaseEntityDto } from './base.entity.dto';
import { OpportunityDto } from './opportunity.dto';

export class FarmDto extends BaseEntityDto implements FarmInterface {
  @ApiProperty({ type: Number, example: 'Curve' })
  name: string;

  @ApiProperty({ type: String, example: 'https://curve.fi/' })
  url: string;

  @ApiProperty({ type: Boolean, example: true })
  isEnabled: boolean;

  @ApiProperty({ type: [OpportunityDto] })
  opportunities: OpportunityDto[];
}
