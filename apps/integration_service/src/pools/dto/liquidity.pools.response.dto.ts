import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ProtocolName } from '@app/common';
import {
  ChainIdEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
} from '@app/common/enum';

import { LiquidityPoolsEntity } from '../entities/liquidity.pools.entity';
import { APYDto } from './apy.dto';
import { ImpermanentLossDto } from './impermanentloss.dto';
import { TokenDto } from './token.dto';

export class LiquidityPoolsResponseDto {
  @ApiProperty({ type: Number, example: 2830808 })
  @Type(() => Number)
  id: number;

  @ApiProperty({ type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d' })
  address: string;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @Type(() => Number)
  chain: ChainIdEnum;

  // TODO: solve the problem it's either protocol or protocol; use enum, enumName
  @ApiProperty({
    enum: [PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum],
    enumName: 'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum',
    example: UniswapProtocolEnum.uniswapV2,
  })
  project: ProjectEnum | ProtocolName;

  @ApiProperty({ type: Number, example: 99690611 })
  @Type(() => Number)
  reserveUsd: number;

  @ApiProperty({ type: APYDto })
  apy: APYDto;

  @ApiProperty({ type: ImpermanentLossDto })
  il: ImpermanentLossDto;

  @ApiProperty({
    type: TokenDto,
    example: {
      id: '0x72630b1e3b42874bf335020ba0249e3e9e47bafc',
      totalSupply: 17595.65235211107,
    },
  })
  token: TokenDto;

  @ApiProperty({
    type: [TokenDto],
    example: [
      {
        id: '0x395c8db957d743a62ac3aaaa4574553bcf2380b3',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        percentage: 50,
        reserve: 1000,
      },
      {
        id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        name: 'fae.df',
        symbol: 'FDF',
        percentage: 50,
        reserve: 290.4075220249111,
      },
    ],
  })
  poolTokens: TokenDto[];

  @ApiProperty({
    type: String,
    example: '2021-04-26T12:15:22.355Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    example: '2021-06-10T11:06:23.343Z',
  })
  updatedAt: Date;

  public fromEntityToDto(entity: LiquidityPoolsEntity): any {
    this.id = +entity.id;
    this.address = entity.address;
    this.chain = +entity.chain;
    this.project =
      entity.project === ProjectEnum.uniswap ? UniswapProtocolEnum.uniswapV2 : entity.project;
    this.reserveUsd = +entity.reserveUsd;
    this.apy = entity.apy;
    this.il = entity.il;
    this.token = entity.token;
    this.poolTokens = entity.poolTokens;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    return this;
  }
}
