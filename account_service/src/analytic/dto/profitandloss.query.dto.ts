import { Address } from '../../common/interfaces';
import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { splitToArrayAndLowerCase } from '../../utils/transform';
import Web3 from 'web3';
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
  asset: Address;

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
  addresses: Address[];
}
