import { ApiProperty } from '@nestjs/swagger';

import { ProjectEnum } from '@app/common/enum';

import { ERC20TokenDto } from './erc20.token.dto';
import { LiquidityPoolDto } from './liquidity.pool.dto';
import { PoolTokenDto } from './pool.token.dto';

export class liquidityPositionDto {
  @ApiProperty({
    type: LiquidityPoolDto,
    required: false,
    example: {
      name: ProjectEnum.sushiswap,
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
    enum: ProjectEnum,
    enumName: 'ProjectEnum',
    example: ProjectEnum.sushiswap,
    required: false,
  })
  project?: ProjectEnum;

  @ApiProperty({ type: Number, required: false, example: 13.8631 })
  earnedFeeUSD?: number;

  @ApiProperty({ type: Number, required: false, example: 1612750664 })
  exitedAt?: number;
}
