import { ApiProperty } from '@nestjs/swagger';

export class SearchEntryMetadataDto {
  @ApiProperty({ required: true })
  chainId: number;

  @ApiProperty({ type: String, required: false, example: 'WG0' })
  symbol?: string;

  @ApiProperty({
    type: String,
    required: false,
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
  })
  address?: string;
}
