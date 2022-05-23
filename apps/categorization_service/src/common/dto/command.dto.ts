import { ApiProperty } from '@nestjs/swagger';

import { CommandUnparameterized } from '../enum/service.enum';

export class CommandDTO {
  @ApiProperty({ enum: CommandUnparameterized })
  command: CommandUnparameterized;
}
