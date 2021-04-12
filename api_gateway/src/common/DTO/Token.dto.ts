import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEthereumAddress, IsNumber, IsString } from 'class-validator';

import { Address, Token } from '../interfaces';
import EthereumAddressDto from './EthereumAddress.dto';

export default class TokenDto implements Token {
  @ApiProperty({ type: Number })
  @IsNumber()
  id: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  isStable: number;

  @ApiProperty({ type: String })
  @IsString()
  name: string;

  @ApiProperty({ type: String })
  @IsString()
  coingeckoId: string;

  @ApiProperty({ type: EthereumAddressDto, example: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e' })
  @IsEthereumAddress()
  address: Address;

  @ApiProperty({ type: Number })
  @IsNumber()
  decimals: number;

  @ApiProperty({ type: Number, example: null })
  @IsNumber()
  abiTypeId: number;

  @ApiProperty({ type: String, example: '2020-09-15T10:41:11.000Z', description: 'UTC' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  price: number;
}
