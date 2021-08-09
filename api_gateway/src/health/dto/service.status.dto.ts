import { ApiProperty } from '@nestjs/swagger';

import { HealthServiceStatusEnum } from 'src/common/enum';

export class ServiceStatusDto {
  @ApiProperty({
    enum: HealthServiceStatusEnum,
    enumName: 'HealthServiceStatus',
    example: HealthServiceStatusEnum.up,
  })
  status: HealthServiceStatusEnum;
}
