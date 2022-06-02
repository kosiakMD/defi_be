import { ApiProperty } from '@nestjs/swagger';

import { ExternalCommand } from '../enum/service.enum';
import { IJobPayload } from './job/job.payload.interface';

export class CommandRequestDto implements IJobPayload {
  @ApiProperty({ enum: ExternalCommand, example: ExternalCommand.start_fetching })
  command: ExternalCommand;

  @ApiProperty({ type: Boolean, required: false, example: false })
  includeProcessed?: boolean = false;
}
