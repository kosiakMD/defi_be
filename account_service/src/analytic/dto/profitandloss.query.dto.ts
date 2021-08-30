import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import Web3 from 'web3';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

import { splitToArrayAndLowerCase } from '../../utils/transform';

const web3 = new Web3();

export class ProfitAndLossQueryDto {
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (!web3.utils.isAddress(value)) {
      throw new BadRequestException(`Asset address '${value}' is not valid`);
    }
    return value.toLowerCase();
  })
  @IsString({ each: true })
  @ApiProperty({ type: String, example: '0xe61fdaf474fac07063f2234fb9e60c1163cfa850' })
  asset: Address;

  @IsNotEmpty()
  chain: ChainIdEnum;

  @IsNotEmpty()
  @Transform(({ value }) => {
    const array = splitToArrayAndLowerCase(value);
    array.forEach((a) => {
      if (!web3.utils.isAddress(a)) {
        throw new BadRequestException(`Address '${a}' is not valid`);
      }
    });
    return array;
  })
  @IsString({ each: true })
  @ApiProperty({
    type: String,
    example:
      '0x73daF3bf3FFA793AE44f4E0d92D4A4016764470C,0x18B6dd0247882cDAB1BD50583224Af2b4c4D614B',
  })
  addresses: Address[];
}
