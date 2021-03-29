import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import BaseDataDto from '../DTO/BaseData.dto';
import EthereumAddressDto from '../DTO/EthereumAddress.dto';
import { BaseData } from '../interfaces';

@ApiTags('Platform')
@Controller('balancer')
export class BalancerController {
	@Get('/:address')
	@ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
	get(@Param() params: EthereumAddressDto): BaseData[] {
		const base = new BaseDataDto();
		return [base];
	}
}
