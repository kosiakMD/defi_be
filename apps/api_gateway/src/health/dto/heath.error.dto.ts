import { ApiProperty } from '@nestjs/swagger';

import { HealthServiceStatusEnum } from '@app/common/enum';

import { ServiceStatusDto } from './service.status.dto';

export class HealthErrorDto {
  @ApiProperty({
    enum: ServiceStatusDto,
    enumName: 'ServiceStatusDto',
    example: HealthServiceStatusEnum.down,
  })
  'integrationService': ServiceStatusDto;
}
