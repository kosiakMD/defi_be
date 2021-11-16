import { BigNumber } from '@ethersproject/bignumber';

import { Address } from '@app/common';

export interface AaveToken {
  id: Address;
  underlyingAssetAddress: Address;
  underlyingAssetDecimals: number;
}

export interface IReserve {
  id: Address;
  name: string;
  underlyingAsset: Address;
  symbol: string;
  decimals: number;
  liquidityRate: BigNumber;
  stableBorrowRate: BigNumber;
  variableBorrowRate: BigNumber;
  aToken: AaveToken;
  sToken: AaveToken;
  vToken: AaveToken;
}

export interface IUserAccountData {
  totalCollateralETH: BigNumber;
  totalDebtETH: BigNumber;
  availableBorrowsETH: BigNumber;
  currentLiquidationThreshold: BigNumber;
  ltv: BigNumber;
  healthFactor: BigNumber;
}
