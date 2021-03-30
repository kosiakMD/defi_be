// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber } from 'class-validator';

import { GasHistory, GasPrice } from '../interfaces';

export class GasPriceDto implements GasPrice {
	@ApiProperty({ type: 'number', example: 146000000000 })
	@IsNumber()
	rapid: number;

	@ApiProperty({ type: 'number', example: 134000000000 })
	@IsNumber()
	fast: number;

	@ApiProperty({ type: 'number', example: 121000000000 })
	@IsNumber()
	standard: number;

	@ApiProperty({ type: 'number', example: 120000000000 })
	@IsNumber()
	slow: number;

	@ApiProperty({ type: 'number', example: 1616539215077 })
	@IsNumber()
	timestamp: number;
}

export class GasHistoryDto implements GasHistory {
	@ApiProperty({ type: 'number', example: 173000000000, description: '' })
	@IsNumber()
	average: number;

	@ApiProperty({ type: 'string', example: '22021-03-16 00:00:01', description: '' })
	@IsDateString()
	time: string;
}
