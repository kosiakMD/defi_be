import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

export class SearchAssetRequest implements SearchParams {
  @ApiProperty({
    type: [String],
    description: 'address array to search assets by addresses',
    example: [
      '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
      '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    ],
    isArray: true,
    required: false,
  })
  addresses?: Address[];

  @ApiProperty({
    type: String,
    example: 'CRO',
    description: 'text to search assets by name or symbol',
    required: false,
  })
  text?: string;

  @ApiProperty({
    type: Number,
    example: 5,
    description: 'maximal number of search result entries',
    required: false,
  })
  limit?: number;
}
