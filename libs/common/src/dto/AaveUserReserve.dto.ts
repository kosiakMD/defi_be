import { AaveUserReserve } from './AaveUser.dto';

export class AaveUser {
  userAddress: string;
  reserves: AaveUserReserve[];
}
