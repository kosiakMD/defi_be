import { ApiProperty } from '@nestjs/swagger';

import { LiquidityPosition, PlatformPoolToken } from '../interfaces';
import { ERC20TokenDto } from './ERC20Token.dto';
import { LiquidityPoolDto } from './LiquidityPool.dto';
import { PlatformPoolTokenDto } from './PlatformPoolToken.dto';

export class LiquidityPositionDto implements LiquidityPosition {
  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20TokenDto;

  @ApiProperty({ type: [PlatformPoolTokenDto] })
  rewards?: PlatformPoolToken[];

  @ApiProperty({ type: [PlatformPoolTokenDto] })
  poolTokens: PlatformPoolToken[];

  @ApiProperty({ type: String, example: '0' })
  lpTokenBalance: string;

  @ApiProperty({ type: LiquidityPoolDto, required: false })
  pool?: LiquidityPoolDto;

  @ApiProperty({ type: Number, example: 1590095728, required: false })
  exitedAt?: number;

  @ApiProperty({ type: Number, example: 0.16599541379112503, required: false })
  earnedFeeUSD?: number;

  @ApiProperty({ type: String, example: 'Uniswap V2', required: false })
  project?: string;
}
