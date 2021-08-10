import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Address, Chains } from 'src/common/interfaces';

import { splitToArray } from '../utils/transform';

export class TransactionQueryDto {
  @IsOptional()
  @Transform(({ value, key }) => {
    if (key && !value) {
      throw new BadRequestException(`Empty param '${key}' is not allowed`);
    }
    return splitToArray(value).map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains: Chains;

  @IsNotEmpty()
  @Transform(({ value }) => splitToArray(value))
  @IsString({ each: true })
  addresses: Address[];
}
