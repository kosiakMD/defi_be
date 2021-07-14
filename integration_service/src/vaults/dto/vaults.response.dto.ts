import { ApiProperty } from '@nestjs/swagger';

import { VaultsEntity } from '../entities/vaults.entity';
import { APYDto } from './apy.dto';
import { TokenDto } from './token.dto';

export class VaultsResponseDto {
  @ApiProperty({ type: Number, example: 26 })
  id: number;

  @ApiProperty({ type: String, example: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd' })
  vaultId: string;

  @ApiProperty({ type: String, example: 'Vault Name' })
  vaultName: string;

  @ApiProperty({ type: String, example: 'sushiswap' })
  project: string;

  @ApiProperty({ type: Number, example: 1 })
  chain: number;

  @ApiProperty({ type: APYDto })
  apy: APYDto;

  @ApiProperty({ type: Number, example: 599126.8215546025 })
  tvl: number;

  @ApiProperty({
    type: TokenDto,
    example: {
      id: '0x17a2194d55f52fd0c711e0e42b41975494bb109b',
    },
  })
  lpToken: TokenDto;

  @ApiProperty({
    type: [TokenDto],
    example: [
      {
        id: '0x1337def16f9b486faed0293eb623dc8395dfe46a',
        name: 'Armor',
        symbol: 'ARMOR',
        percentage: 50,
      },
      {
        id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
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
      id: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
      address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
      name: 'SushiToken',
      symbol: 'SUSHI',
      decimals: 18,
      totalSupply: null,
      priceUSD: 22.17,
    },
  })
  rewardToken: TokenDto;

  @ApiProperty({ type: String, example: '2021-04-11T20:02:34.329Z' })
  createdAt: Date;

  @ApiProperty({ type: String, example: '2021-05-18T18:42:31.345Z' })
  updatedAt: Date;

  public fromEntityToDto(entity: VaultsEntity) {
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
