import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { EtherscanEnum } from '../constants';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
	@Get('/')
	@ApiQuery({
		name: 'addresses',
		type: String,
		isArray: true,
		description: 'comma-separated Array String',
	})
	@ApiQuery({
		name: 'etherscan',
		enum: EtherscanEnum,
		required: false,
		description: `either true or false; default is 'false'`,
	})
	@ApiResponse({ status: 200, type: String })
	get(
		@Query('addresses', new ParseArrayPipe({ items: String, separator: ',' }))
		addresses: string[],
		@Query('etherscan') etherscan: EtherscanEnum,
	): string[] {
		const lowerCaseAddresses = addresses.map((address) => address.toLowerCase());
		return etherscan ? lowerCaseAddresses : lowerCaseAddresses;
	}

	@Get('/ethereum')
	@ApiQuery({
		name: 'addresses',
		type: String,
		description: 'comma-separated Array String',
	})
	@ApiResponse({ status: 200, type: String })
	getEthereum(
		@Query('addresses', new ParseArrayPipe({ items: String, separator: ',' }))
		addresses: string[],
	): string[] {
		// TODO: plug
		return addresses.map((address) => address.toLowerCase());
	}
}
