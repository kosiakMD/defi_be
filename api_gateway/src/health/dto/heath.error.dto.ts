import { ApiProperty } from '@nestjs/swagger';

import { ServiceStatusDto } from './service.status.dto';
import { HealthServiceStatusEnum } from 'src/common/enum';

export class HealthErrorDto {
  @ApiProperty({
    type: ServiceStatusDto,
    example: HealthServiceStatusEnum.down,
  })
  'integrationService': ServiceStatusDto;
}
