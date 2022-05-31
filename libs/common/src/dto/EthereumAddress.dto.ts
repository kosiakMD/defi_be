import { IsEthereumAddress } from 'class-validator';

import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common/types';

@ApiExtraModels()
export default class EthereumAddressDto extends String {
  constructor(value: string) {
    super(value);
  }
  @ApiProperty({ type: String, example: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7' })
  @IsEthereumAddress({ message: 'The string is not a valid Ethereum address' })
  address: Address;
  // [Symbol.toPrimitive]: Address;
}
