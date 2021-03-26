import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNumber, IsString } from 'class-validator';
import { Address, PoolToken, Symbol } from '../interfaces';

export default class PoolTokenDto implements PoolToken {

	@ApiProperty({ type: String, example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' })
	@IsEthereumAddress()
	id: Address;

	@ApiProperty({ type: String, example: 'USD//C' })
	@IsString()
	name: string;

	@ApiProperty({ type: Number, example: 'USDC' })
	@IsString()
	symbol: Symbol;

	@ApiProperty({ type: Number, example: 50 })
	@IsNumber()
	percentage: number;

}
