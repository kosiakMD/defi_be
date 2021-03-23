import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ERC20Token } from '../interfaces';

export class ERC20TokenDto implements ERC20Token {
	@ApiProperty({ type: 'string', required: true })
	@IsString()
	@IsNotEmpty()
	address: string;

	@ApiProperty({ type: 'string', required: false })
	@IsString()
	name?: string;

	@ApiProperty({ type: 'string', required: false })
	@IsString()
	symbol?: string;

	@ApiProperty({ type: 'number', required: false })
	@IsNumber()
	decimals?: number;

	@ApiProperty({
		type: 'string',
		required: false,
		example: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
	})
	@IsString()
	totalSupply?: string;
}
