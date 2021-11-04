import { Address, ERC20Token } from '@app/common';

interface Allowance {
  owner: Address;
  spender: Address;
  amount: string;
}
export interface IIronBankUserPosition {
  assetAddress: Address;
  tokenAddress: Address;
  typeId: string;
  balance: number;
  underlyingTokenBalance: {
    amount: string;
    amountUsdc: string;
  };
  assetAllowances: Allowance[];
  tokenAllowances: Allowance[];
}

export interface IMarketMetadata {
  totalSuppliedUsdc: number;
  totalBorrowedUsdc: number;
  lendAprBips: number;
  borrowAprBips: number;
  lendApyBips: number;
  borrowApyBips: number;
  liquidity: number;
  liquidityUsdc: number;
  collateralFactor: number;
  isActive: boolean;
  reserveFactor: number;
  exchangeRate: number;
}

export interface IIronBankMarketDynamic {
  address: Address;
  typeId: 'IRON_BANK_MARKET';
  tokenId: Address;
  underlyingTokenBalance: number;
  metadata: IMarketMetadata;
}

export interface IYearnUser {
  id: string;
  positions: IVaultPosition[];
}

interface IVaultCommon {
  token: ERC20Token;
  shareToken: ERC20Token;
}

export interface IVaultV1Position extends IVaultCommon {
  shareBalance: number;
  balance: never;
  vault: { address: string; pricePerFullShare: number };
}

export interface IVaultV2Position extends IVaultCommon {
  shareBalance: never;
  balance: number;
  vault: { address: string; pricePerFullShare: never };
}

export type IVaultPosition = IVaultV1Position | IVaultV2Position;
