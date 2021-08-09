import { ApiProperty } from '@nestjs/swagger';

import { ERC20TokenDto } from './erc20.token.dto';
import { LiquidityPoolDto } from './liquidity.pool.dto';
import { PoolTokenDto } from './pool.token.dto';
import { PlatformEnum } from 'src/common/enum';

export class liquidityPositionDto {
  @ApiProperty({
    type: LiquidityPoolDto,
    required: false,
    example: {
      name: PlatformEnum.sushiswap,
      address: '0x795065dcc9f64b5614c407a6efdc400da6221fb0',
    },
  })
  pool?: LiquidityPoolDto;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20TokenDto;

  @ApiProperty({ type: [PoolTokenDto] })
  poolTokens: PoolTokenDto[];

  @ApiProperty({ type: String, example: '13654.125822002' })
  lpTokenBalance: string;

  @ApiProperty({
    enum: PlatformEnum,
    enumName: 'PlatformEnum',
    example: PlatformEnum.sushiswap,
    required: false,
  })
  project?: PlatformEnum;

  @ApiProperty({ type: Number, required: false, example: 13.8631 })
  earnedFeeUSD?: number;

  @ApiProperty({ type: Number, required: false, example: 1612750664 })
  exitedAt?: number;
}
