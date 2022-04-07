import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common';

interface TransactionQuery {
  addresses: string[];
  chains: number[];
}

export class TransactionsQueryDto implements TransactionQuery {
  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains: number[] = [1];

  @IsNotEmpty()
  @IsString({ each: true })
  addresses: string[];

  constructor(data: TransactionsQueryDto) {
    Object.assign(this, data);
  }
}
