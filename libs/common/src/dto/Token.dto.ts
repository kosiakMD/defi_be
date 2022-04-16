import { IsDateString, IsEthereumAddress, IsNumber, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../types';

import { Token } from '../interfaces';
import EthereumAddressDto from './EthereumAddress.dto';

export class TokenDto implements Token {
  @ApiProperty({ type: Number, example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ type: Number, example: 0 })
  @IsNumber()
  is_stable: number; // eslint-disable-line camelcase

  @ApiProperty({ type: String, name: 'YFI' })
  @IsString()
  name: string;

  @ApiProperty({ type: String, example: 'yearn-finance' })
  @IsString()
  coingecko_id: string; // eslint-disable-line camelcase

  @ApiProperty({ type: EthereumAddressDto, example: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e' })
  @IsEthereumAddress()
  address: Address;

  @ApiProperty({ type: Number, example: 18 })
  @IsNumber()
  decimals: number;

  @ApiProperty({ type: Number, example: null })
  @IsNumber()
  abi_type_id: number; // eslint-disable-line camelcase

  @ApiProperty({ type: String, example: '2020-09-15T10:41:11.000Z', description: 'UTC' })
  @IsDateString()
  created_at: string; // eslint-disable-line camelcase

  @ApiProperty({ type: Number, example: 6.12 })
  @IsNumber()
  price: number;
}
