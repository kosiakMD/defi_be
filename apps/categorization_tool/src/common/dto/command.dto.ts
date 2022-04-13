import { ApiProperty } from '@nestjs/swagger';

import { Command } from '../enum/service.enum';

export class CommandDTO {
  @ApiProperty({ enum: Command })
  command: Command;
}
