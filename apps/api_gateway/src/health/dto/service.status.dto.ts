import { ApiProperty } from '@nestjs/swagger';

import { HealthServiceStatusEnum } from '@app/common/enum';

export class ServiceStatusDto {
  @ApiProperty({
    enum: HealthServiceStatusEnum,
    enumName: 'HealthServiceStatus',
    example: HealthServiceStatusEnum.up,
  })
  status: HealthServiceStatusEnum;
}
