import { IsNotEmpty, IsString } from 'class-validator';

import { Address } from '../../common/interfaces';

export class ProfitAndLossQueryDto {
  @IsNotEmpty()
  @IsString({ each: true })
  asset: Address;

  @IsNotEmpty()
  @IsString({ each: true })
  addresses: Address;
}
