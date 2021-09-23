import { AaveReserve } from './AaveReserve.dto';

export class AaveUserReserve {
  currentTotalDebt = '0';
  currentStableDebt = '0';
  currentVariableDebt = '0';
  currentATokenBalance = '0';
  reserve: AaveReserve;
}
