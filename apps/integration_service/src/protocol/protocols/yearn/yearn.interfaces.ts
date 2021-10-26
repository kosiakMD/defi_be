import { ERC20Token } from '@app/common';

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
