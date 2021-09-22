import { Address } from '@app/common';

import { QUICKSWAP_STAKING_CONTRACTS } from './constants';

export const getContractByPair = (_: Address): Address =>
  QUICKSWAP_STAKING_CONTRACTS.find((__) => __.pairAddress === _).stakingContractAddress;

export const getPairByContract = (_: Address): Address =>
  QUICKSWAP_STAKING_CONTRACTS.find((__) => __.stakingContractAddress === _).pairAddress;
