import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

enum EtherscanEnum {
	'false',
	'true',
}

@ApiTags('balances')
@Controller('balances')
export class BalancesController {
	@Get(':addresses')
	@ApiQuery({ name: 'address', type: 'string', isArray: true })
	@ApiQuery({ name: 'etherscan', enum: EtherscanEnum, required: false })
	async get(
		@Query('address') addresses: string[],
		@Query('etherscan') etherscan: EtherscanEnum,
	) {
		const lowerCaseAddresses = addresses.map((address) =>
			address.toLowerCase(),
		);
		return etherscan ? lowerCaseAddresses : lowerCaseAddresses;
	}
}
