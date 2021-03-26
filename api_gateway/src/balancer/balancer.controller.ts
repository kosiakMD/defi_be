import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import EthereumAddressDto from '../DTO/EthereumAddress.dto';
import { BaseData } from '../interfaces';
import BaseDataDto from '../DTO/BaseData.dto';

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
