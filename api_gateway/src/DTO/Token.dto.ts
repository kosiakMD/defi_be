import EthereumAddressDto from "./EthereumAddress.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEthereumAddress, IsNumber, IsString } from "class-validator";
import { Address, Token } from '../interfaces';

export default class TokenDto implements Token {
	@ApiProperty({ type: Number })
	@IsNumber()
	id: number;

	@ApiProperty({ type: Number })
	@IsNumber()
	is_stable: number;

	@ApiProperty({ type: String })
	@IsString()
	name: string;

	@ApiProperty({ type: String })
	@IsString()
	coingecko_id: string;

	@ApiProperty({ type: EthereumAddressDto, example: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e' })
	@IsEthereumAddress()
	address: Address;

	@ApiProperty({ type: Number })
	@IsNumber()
	decimals: number;

	@ApiProperty({ type: Number, example: null })
	@IsNumber()
	abi_type_id: number;

	@ApiProperty({ type: String, example: '2020-09-15T10:41:11.000Z', description: 'UTC' })
	@IsDateString()
	created_at: string;

	@ApiProperty({ type: Number })
	@IsNumber()
	price: number;
}
