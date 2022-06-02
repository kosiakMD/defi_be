import { ApiProperty } from '@nestjs/swagger';

import { InternalCommand, CommandType } from '../enum/service.enum';
import { IJobPayload } from './job/job.payload.interface';

export class ContractAnalyseRequestDto implements IJobPayload {
  command: CommandType = InternalCommand.contract_analyse;

  @ApiProperty({ type: String })
  address: string;
}
