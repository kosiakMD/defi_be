import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ProjectEnum } from 'src/common/enum';

import { VaultsEntity } from '../entities/vaults.entity';
import { APYDto } from './apy.dto';
import { TokenDto } from './token.dto';

export class VaultsResponseDto {
  @ApiProperty({ type: Number, example: 26 })
  id: number;

  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  vaultId: string;

  @ApiProperty({ type: String, example: 'compound' })
  vaultName: string;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.sushiswap })
  project: ProjectEnum;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ type: APYDto })
  apy: APYDto;

  @ApiProperty({ type: Number, example: 599126.8215546025 })
  tvl: number;

  @ApiProperty({
    type: TokenDto,
    example: {
      id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })
  lpToken: TokenDto;

  @ApiProperty({
    type: [TokenDto],
    example: [
      {
        id: '0x72630b1e3b42874bf335020ba0249e3e9e47bafc',
        name: 'Armor',
        symbol: 'ARMOR',
        percentage: 50,
      },
      {
        id: '0x395c8db957d743a62ac3aaaa4574553bcf2380b3',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        percentage: 50,
      },
    ],
  })
  liquidityPoolTokens: TokenDto[];

  @ApiProperty({
    type: TokenDto,
    example: {
      id: '707388',
      address: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      totalSupply: null,
      priceUSD: 22.17,
    },
  })
  rewardToken: TokenDto;

  @ApiProperty({ type: String, example: '2021-04-26T12:15:22.355Z' })
  createdAt: Date;

  @ApiProperty({ type: String, example: '2021-06-10T11:06:23.343Z' })
  updatedAt: Date;

  public fromEntityToDto(entity: VaultsEntity): any {
    this.id = +entity.id;
    this.vaultId = entity.vaultId;
    this.vaultName = entity.vaultName;
    this.project = entity.project;
    this.chain = +entity.chain;
    this.apy = entity.apy;
    this.tvl = +entity.tvl;
    this.lpToken = entity.lpToken;
    this.liquidityPoolTokens = entity.liquidityPoolTokens;
    this.rewardToken = entity.rewardToken;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    return this;
  }
}
