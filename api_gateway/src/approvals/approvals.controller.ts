import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import EthereumAddressDto from '../DTO/EthereumAddress.dto';
import ContractApprovalDto from '../DTO/ContractApproval.dto';
import { ContractApproval } from '../interfaces';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
	@Get('/:address')
	@ApiResponse({ status: 200, type: ContractApprovalDto, isArray: true })
	get(@Param() params: EthereumAddressDto): ContractApproval[] {
		const contract = new ContractApprovalDto();
		contract.token.address = params.address;
		return [contract];
	}
}
