import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import EthereumAddress from '../DTO/EthereumAddress';

@ApiTags('approvals')
@Controller('approvals')
export class ApprovalsController {
	@Get('/:address')
	get(@Param() params: EthereumAddress): string {
		return `${params.address}`;
	}
}
