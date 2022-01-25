import { LendingErcToken } from '@app/common/dto/LendingErcToken.dto';

export class LendingPositionDto {
  address: string;
  balance: number;
  value: number;
  apy: number;
  token: LendingErcToken;
}
