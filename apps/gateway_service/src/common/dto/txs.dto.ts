import { ApiProperty } from '@nestjs/swagger';

import { LiquidityChangeTypeEnum } from '../enum';
import { PlatformPoolToken, txs } from '../interfaces';
import { PlatformPoolTokenDto } from './platform-pool-token.dto';

export class txsDto implements txs {
  @ApiProperty({
    enum: LiquidityChangeTypeEnum,
    enumName: 'LiquidityChangeTypeEnum',
    example: LiquidityChangeTypeEnum.removeLiquidity,
  })
  type: LiquidityChangeTypeEnum;

  @ApiProperty({
    type: String,
    example: '0x2b2e6a1f1cbcea52b6dd5e63141fc6a5bd5d1c29b52595d10eb5d85786f3a458',
  })
  hash: string;

  @ApiProperty({ type: Number, example: 12899280 })
  blockNumber: number;

  @ApiProperty({ type: Number, example: 1627267965 })
  timestamp: number;

  @ApiProperty({ type: String, example: '11.233940819226762292' })
  liquidity: string;

  @ApiProperty({ type: Number, example: 6525.844121087791 })
  amountUSD: number;

  @ApiProperty({ type: Number, example: 14 })
  gasPrice: number;

  @ApiProperty({ type: Number, example: 1982.064 })
  gasPriceUsd: number;

  @ApiProperty({ type: Number, example: 141.576 })
  gasUsed: number;

  @ApiProperty({ type: String, example: '0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974' })
  lpTokenAddress: string;

  @ApiProperty({ type: [PlatformPoolTokenDto] })
  tokens: PlatformPoolToken[];
}
