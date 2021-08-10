import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from 'src/common/enum';

import { Asset, AssetState } from './assets.interface';

export class AssetDto implements Asset {
  @ApiProperty({ type: Number, example: 1066834 })
  id: number;

  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  address: string;

  @ApiProperty({ type: String, example: '0x Protocol Token' })
  name: string;

  @ApiProperty({ type: String, example: 'ZRX' })
  symbol: string;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ enum: AssetState, enumName: 'AssetState' })
  status: AssetState;
}
