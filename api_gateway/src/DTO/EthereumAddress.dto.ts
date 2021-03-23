import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';
import { Address } from '../interfaces';

@ApiExtraModels()
export default class EthereumAddressDto {
	@ApiProperty({ type: 'string' })
	@IsEthereumAddress({ message: 'The string is not a valid Ethereum address' })
	address: Address;
}
