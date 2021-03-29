import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNumber, IsString } from 'class-validator';

import { Address, PoolToken, TokenSymbol } from '../interfaces';

export default class PoolTokenDto implements PoolToken {
	@ApiProperty({ type: String, example: '0x8207c1ffc5b6804f6024322ccf34f29c3541ae26' })
	@IsEthereumAddress()
	id: Address;

	@ApiProperty({ type: String, example: 'OriginToken' })
	@IsString()
	name: string;

	@ApiProperty({ type: Number, example: 'OGN' })
	@IsString()
	symbol: TokenSymbol;

	@ApiProperty({ type: Number, example: 50 })
	@IsNumber()
	percentage: number;
}
