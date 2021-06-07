import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { Chains } from '../../common/types';

interface TransactionQuery {
  addresses: string[];
  chains: Chains;
}

export class TransactionQueryDto implements TransactionQuery{
  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains;

  @IsNotEmpty()
  @IsString({ each: true })
  addresses: string[];

  constructor(data: TransactionQueryDto) {
    Object.assign(this, data);
  }
}
