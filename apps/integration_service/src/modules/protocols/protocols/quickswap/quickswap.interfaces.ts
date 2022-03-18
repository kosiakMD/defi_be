import { Address } from '@app/common';

export interface IContractInfo {
  stakingContractAddress: Address;
  pairAddress: Address;
}

export interface IQuickswapResponse {
  stakingContracts: IContractInfo[];
  dualStakingContracts: IContractInfo[];
}
