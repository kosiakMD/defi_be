import { ApiProperty } from '@nestjs/swagger';
import { AMMTransaction } from 'src/interfaces/liquidity.position.interfaces';

import { ERC20TokenDto } from './erc20.token.dto';
import { LiquidityChangeTransactionDto } from './liquidity.change.transaction.dto';
import { LiquidityPoolDto } from './liquidity.pool.dto';
import { PoolTokenDto } from './pool.token.dto';

export class liquidityPositionDto {
  @ApiProperty({
    type: LiquidityPoolDto,
    required: false,
    example: {
      name: 'sushiswap',
      address: '0x795065dcc9f64b5614c407a6efdc400da6221fb0',
    },
  })
  pool?: LiquidityPoolDto;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20TokenDto;

  @ApiProperty({ type: String, example: '13654.125822002' })
  lpTokenBalance: string;

  @ApiProperty({ type: String, example: 'sushiswap', required: false })
  project?: string;

  @ApiProperty({
    type: [PoolTokenDto],
    example: [
      {
        address: '0x795065dcc9f64b5614c407a6efdc400da6221fb0',
        reserve: '19515604.638277984175730315',
        percentage: '50',
        amount: '0.2262',
        priceUSD: 0.485,
        name: 'Token',
        symbol: 'TKN',
        decimals: 18,
        totalSupply: '0.2222',
      },
      {
        address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        reserve: '152315604.638277984175730315',
        percentage: '50',
        amount: '0.4262',
        priceUSD: 0.126,
        name: 'Test',
        symbol: 'TES',
        decimals: 18,
        totalSupply: '0.4222',
      },
    ],
  })
  poolTokens: PoolTokenDto[];

  @ApiProperty({
    type: [LiquidityChangeTransactionDto],
    required: false,
    example: [{ type: 'addLiquidity' }, { type: 'removeLiquidity' }],
  })
  transactions?: AMMTransaction[];

  @ApiProperty({ type: Number, required: false, example: 13.8631 })
  earnedFeeUSD?: number;

  @ApiProperty({ type: Number, required: false, example: 1612750664 })
  exitedAt?: number;
}
