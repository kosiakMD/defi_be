import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import BaseDataDto from '../DTO/BaseData.dto';
import { PlatformData } from '../interfaces';
import PlatformDataDto from '../DTO/PlatofrmData.dto';
import EthereumAddressDto from '../DTO/EthereumAddress.dto';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
	@Get('/:address')
	@ApiResponse({ status: 200, type: PlatformDataDto })
	get(@Param() params: EthereumAddressDto): PlatformData {
		const base = new BaseDataDto();
		return {
			balancer: [base],
			curve: [base],
			sushiswap: [base],
			uniswap: [base],
		};
	}
}
