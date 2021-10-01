import { LendingErcToken } from '@app/common/dto/LendingErcToken.dto';

export class LendingPositionDto {
  address: string;
  totalDeposit?: string;
  balance: number;
  value: number;
  APY: number;
  token: LendingErcToken;
}
