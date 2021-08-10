import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from 'src/common/enum';

import { AssetState } from './assets.interface';

export class AssetsDto {
  @ApiProperty({ type: Number, example: 13 })
  id: number;
  @ApiProperty({ type: String, example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' })
  address: string;
  @ApiProperty({ type: String, example: 'Aave' })
  name: string;
  @ApiProperty({ type: String, example: 'AAVE' })
  symbol: string;
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ enum: AssetState, enumName: 'AssetState', example: AssetState.processing })
  status: AssetState;
}
