// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Pair, Token } from '../assets.interface';

export class TokenDto implements Token {
  @ApiProperty({ type: String, example: '0x3d56fa439a97632922d2b265fbc1426aa2f8e443' })
  tokenAddress: string;

  @ApiProperty({ type: Number, example: 1 })
  pairPosition: number;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
}

export class PairDto implements Pair {
  @ApiProperty({ type: String, example: '0x3d56fa439a97632922d2b265fbc1426aa2f8e443' })
  address: string;

  @ApiProperty({ type: TokenDto, isArray: true })
  tokens?: TokenDto[];

  @ApiProperty({ type: String, example: 'uniswapV2' })
  type?: string;
}
