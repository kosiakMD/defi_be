import { ApiProperty } from '@nestjs/swagger';

import { ServiceStatusDto } from './service.status.dto';

export class HealthServicesDto {
  @ApiProperty({
    type: ServiceStatusDto,
  })
  'accountService': ServiceStatusDto;

  @ApiProperty({
    type: ServiceStatusDto,
  })
  'accountServiceDatabase': ServiceStatusDto;

  @ApiProperty({
    type: ServiceStatusDto,
  })
  'integrationService': ServiceStatusDto;

  @ApiProperty({
    type: ServiceStatusDto,
  })
  'integrationServiceDatabase': ServiceStatusDto;

  @ApiProperty({
    type: ServiceStatusDto,
  })
  'priceService': ServiceStatusDto;

  @ApiProperty({
    type: ServiceStatusDto,
  })
  'priceServiceDatabase': ServiceStatusDto;
}
