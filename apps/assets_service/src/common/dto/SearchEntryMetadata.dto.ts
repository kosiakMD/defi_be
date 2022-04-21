import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common';

export class SearchEntryMetadataDto {
  @ApiProperty({
    type: String,
    required: false,
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
  })
  address?: string;
  @ApiProperty({ enum: ChainIdEnum, required: false, example: 1 })
  chainId?: ChainIdEnum;
  @ApiProperty({ type: String, required: false, example: 'WG0' })
  symbol?: string;
}
