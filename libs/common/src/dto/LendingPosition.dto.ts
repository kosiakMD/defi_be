import { Expose } from 'class-transformer';

import { LendingErcToken } from '@app/common/dto/LendingErcToken.dto';

export class LendingPositionDto {
  @Expose()
  address: string;
  @Expose()
  balance: number;
  @Expose()
  value: number;
  @Expose()
  apy: number;
  @Expose()
  token: LendingErcToken;
}
