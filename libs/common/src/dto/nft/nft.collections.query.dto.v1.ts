import { Transform } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';
import { splitToArray, unifyAddress, unifyAddresses } from '@app/common/utils';

export class NftCollectionsQueryDtoV1 {
  @ApiProperty({
    type: [String],
    example: [
      '0x64850F38e800E04eF773efca8FCaFdceFe977f9D',
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
    ],
  })
  @Transform(({ value }) =>
    Array.isArray(value) ? unifyAddresses(value) : splitToArray(value).map(unifyAddress),
  )
  addresses: Address[] = null;

  @ApiProperty({ type: [Number], example: [1, 4, 12, 19], default: [], required: false })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((n) => Number(n)) : [Number(value)]))
  chains: number[] = [];
}
