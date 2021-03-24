import { ApiProperty } from '@nestjs/swagger';
import { BaseData, PlatformData } from '../interfaces';
import BaseDataDto from './BaseData.dto';

export default class PlatformDataDto implements PlatformData {
	@ApiProperty({ type: BaseDataDto, isArray: true })
		balancer: BaseData[];

	@ApiProperty({ type: BaseDataDto, isArray: true })
		curve: BaseData[];

	@ApiProperty({ type: BaseDataDto, isArray: true })
		sushiswap: BaseData[];

	@ApiProperty({ type: BaseDataDto, isArray: true })
		uniswap: BaseData[];
}
