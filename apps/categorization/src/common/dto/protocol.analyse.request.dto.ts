import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InternalCommand, CommandType } from '../enum/service.enum';
import { IJobPayload } from './job/job.payload.interface';

export class ProtocolAnalyseRequestDto implements IJobPayload {
  command: CommandType = InternalCommand.protocol_analyse;

  @ApiProperty({ type: String, example: 'https://compound.finance' })
  website: string;

  @ApiPropertyOptional({ type: String, example: 'Compound' })
  name?: string;
}
