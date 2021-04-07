import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { BaseData } from '../interfaces';

export default class BaseDataDto<T = string> implements BaseData<T> {
	@ApiProperty({ type: String })
	@IsString()
	userAddress: string;

	@ApiProperty({ type: String })
	@IsString()
	protocolName: string;

	@ApiProperty({ type: String })
	@IsString()
	protocolType: T;
}
