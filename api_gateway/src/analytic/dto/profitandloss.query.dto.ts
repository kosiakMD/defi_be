import { IsNotEmpty, IsString } from 'class-validator';

import { Address } from '../../common/interfaces';
import { ChainId } from '../../transactions/enums';

export class ProfitAndLossQueryDto {
  @IsNotEmpty()
  @IsString({ each: true })
  asset: Address;

  @IsNotEmpty()
  chain: ChainId;

  @IsNotEmpty()
  @IsString({ each: true })
  addresses: Address;
}
