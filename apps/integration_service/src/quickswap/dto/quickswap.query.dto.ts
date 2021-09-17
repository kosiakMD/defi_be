import { Transform } from 'class-transformer';
import Web3 from 'web3';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

const web3 = new Web3();

export class QuickswapQueryDto {
  // TODO: Implement @Addresses decorator
  @Transform(({ value }) => {
    try {
      value.split(',').forEach((a) => {
        if (!web3.utils.isAddress(a)) {
          throw new BadRequestException(`Address '${a}' is not valid`);
        }
      });

      return value;
    } catch (e) {
      throw new BadRequestException();
    }
  })
  @ApiProperty({
    type: String,
    example:
      '0x0000000000000000000000000000000000000000,0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    description: 'Array of address (comma separated)',
  })
  addresses: string;
}
