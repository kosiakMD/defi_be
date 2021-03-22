import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';

export default class EthereumAddress {
	@ApiProperty()
	@IsEthereumAddress({ message: 'The string is not a valid Ethereum address' })
	address: string;
}
