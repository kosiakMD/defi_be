import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ChainsIds } from '../../common/types';

interface TransactionQuery {
  addresses: string[];
  chains: ChainsIds;
}

export class TransactionQueryDto implements TransactionQuery {
  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains: ChainsIds;

  @IsNotEmpty()
  @IsString({ each: true })
  addresses: string[];

  constructor(data: TransactionQueryDto) {
    Object.assign(this, data);
  }
}
