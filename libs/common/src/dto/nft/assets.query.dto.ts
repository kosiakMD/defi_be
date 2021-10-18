import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

export class AssetsQueryDto {
  @ApiProperty({
    type: [String],
    example: [
      '0x64850F38e800E04eF773efca8FCaFdceFe977f9D',
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
    ],
  })
  addresses: Address[];
}
