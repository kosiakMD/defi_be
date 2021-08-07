import { ApiProperty } from '@nestjs/swagger';
import { PlatformEnum, LiquidityChangeTypeEnum } from 'src/common/enum';
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
      name: PlatformEnum.sushiswap,
      address: '0x795065dcc9f64b5614c407a6efdc400da6221fb0',
    },
  })
  pool?: LiquidityPoolDto;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20TokenDto;

  @ApiProperty({ type: String, example: '13654.125822002' })
  lpTokenBalance: string;

  @ApiProperty({
    enum: PlatformEnum,
    enumName: 'PlatformEnum',
    example: PlatformEnum.sushiswap,
    required: false,
  })
  project?: PlatformEnum;

  @ApiProperty({
    type: [PoolTokenDto],
    example: [
      {
        address: '0x72630b1e3b42874bf335020ba0249e3e9e47bafc',
        reserve: '19515604.6385',
        percentage: '50',
        amount: '0.2262',
        priceUSD: 0.485,
        name: 'ulock.eth Wrapped Ether',
        symbol: 'UETH',
        decimals: 18,
        totalSupply: '1033405.00701',
      },
      {
        address: '0x395c8db957d743a62ac3aaaa4574553bcf2380b3',
        reserve: '45603.12',
        percentage: '50',
        amount: '1009',
        priceUSD: 0.126,
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        totalSupply: '6582.36',
      },
    ],
  })
  poolTokens: PoolTokenDto[];

  @ApiProperty({
    type: [LiquidityChangeTransactionDto],
    required: false,
    example: [
      { type: LiquidityChangeTypeEnum.addLiquidity },
      { type: LiquidityChangeTypeEnum.removeLiquidity },
    ],
  })
  transactions?: AMMTransaction[];

  @ApiProperty({ type: Number, required: false, example: 13.8631 })
  earnedFeeUSD?: number;

  @ApiProperty({ type: Number, required: false, example: 1612750664 })
  exitedAt?: number;
}
