import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

export class ProfitAndLossQueryDto {
  @IsNotEmpty()
  @IsString({ each: true })
  @ApiProperty({ type: String, example: '0xe61fdaf474fac07063f2234fb9e60c1163cfa850' })
  asset: Address;

  @IsNotEmpty()
  chain: ChainIdEnum;

  @IsNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    type: String,
    example:
      '0x73daF3bf3FFA793AE44f4E0d92D4A4016764470C,0x18B6dd0247882cDAB1BD50583224Af2b4c4D614B',
  })
  addresses: Address;
}
