import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

enum EtherscanEnum {
	'false',
	'true',
}

@ApiTags('balances')
@Controller('balances')
export class BalancesController {
	@Get('/')
	@ApiQuery({
		name: 'addresses',
		type: 'string',
		isArray: true,
		description: 'comma-separated string',
	})
	@ApiQuery({
		name: 'etherscan',
		enum: EtherscanEnum,
		required: false,
		description: `either true or false; default is 'false'`,
	})
	async get(
		@Query('addresses', new ParseArrayPipe({ items: String, separator: ',' }))
			addresses: string[],
		@Query('etherscan') etherscan: EtherscanEnum,
	) {
		const lowerCaseAddresses = addresses.map((address) =>
			address.toLowerCase(),
		);
		return etherscan ? lowerCaseAddresses : lowerCaseAddresses;
	}
}
