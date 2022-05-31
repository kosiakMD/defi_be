import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, FeatureEnum } from '@app/common';

export class SearchEntryMetadataDto {
  @ApiProperty({ type: String, required: false, example: '' })
  address?: string;
  @ApiProperty({ type: String, required: false, example: 'Balancer 66BAL-33WETH' })
  description?: string;
  @ApiProperty({ type: String, required: false, example: 'Mojitoswap' })
  protocol?: string;
  @ApiProperty({ enum: ChainIdEnum, required: false, example: 1 })
  chainId?: ChainIdEnum;
  @ApiProperty({ type: String, required: false, example: 'WG0' })
  symbol?: string;
  @ApiProperty({ enum: FeatureEnum, required: false, example: 'pools' })
  feature?: FeatureEnum;
}
