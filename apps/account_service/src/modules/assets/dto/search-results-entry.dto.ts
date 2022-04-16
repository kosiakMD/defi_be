import { ApiProperty } from '@nestjs/swagger';
import { SearchEntryMetadataDto } from './search-entry-metadata.dto';
import { SearchResultType } from './search-result.type';
import { AddressMetadata, AssetMetadata } from './interfaces';

export class SearchResultsEntryDto {
  @ApiProperty({ type: String, required: false, example: 'CRO' })
  name?: string;
  @ApiProperty({
    type: String,
    required: false,
    example: 'https://logos.covalenthq.com/tokens/0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b.png',
  })
  icon?: string;
  @ApiProperty({ enum: SearchResultType, example: SearchResultType.ADDRESS })
  type: SearchResultType;
  @ApiProperty({ type: SearchEntryMetadataDto })
  metadata: AddressMetadata | AssetMetadata;
}