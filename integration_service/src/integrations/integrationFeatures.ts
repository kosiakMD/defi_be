// eslint-disable-next-line max-classes-per-file
import { ProtocolName, TransactionTypeEnum } from '../common/enum';

import { SwapToken } from '../interfaces/transactions.interfaces';
import { LiquidityPoolFeature } from './integrations.dto';

export interface APY {
  day: number;
  week: number;
  month: number;
}

export interface Currency {
  id: number;
  name: string;
}

export interface Price {
  value: number;
  currency?: Currency;
}

export interface Balance {
  value: number;
  raw?: string;
  currencyValue?: Price;
}

// export type Reserve = {
//   value: string | number;
//   // currency?: Currency;
// };

// type ROI = {
//   day: number;
//   week: number;
//   year: number;
// };

// export interface BorrowFeature {
//   balance: Balance;
//   assets: AssetData[];
//   apy?: APY;
//   apr?: number;
// }

// Deposit
// export interface LendingFeature {
//   balance: Balance;
//   assets: AssetData[];
//   apy?: APY;
//   apr?: number;
// }

// export interface VaultFeature {
//   id: string;
//   label: string;
//   tvl: number;
//   assets: AssetData[];
//   apy: APY;
//   lpToken: AssetData;
//   rewardToken: AssetData;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface Order {
//   makerAsset: AssetData;
//   takerAsset: AssetData;
//   makerAmount: number;
//   takerAmount: number;
//   fillData: {
//     tokenAddressPath: string[];
//     router: string;
//   };
//   source: string;
//   sourcePathId: string;
//   type: string;
// }

export interface Source {
  name: ProtocolName;
  proportion: number;
}

export interface CryptoCurrency {
  id: number;
  name: string;
}

export interface GasPriceDto {
  value: number;
  currency: CryptoCurrency;
}

export interface Gas {
  used: number; // amount
  price: GasPriceDto;
  fee: Price;
}

// export interface ExchangeFeature {
//   sellAsset: AssetData;
//   buyAsset: AssetData;
//   sellAmount: number;
//   buyAmount: number;
//   gas: Gas;
//   ownerAddress: string;
//   slippagePercentage: number;
//   orders: Order[];
//   sources: Source[];
// }

// export interface BalanceFeature {
//   type: string;
//   category?: string;
//   address: string;
//   label: string;
//   symbol: string;
//   asset: AssetData;
//   balance: Balance;
//   price: Price;
// }

interface Transaction<T = string> {
  type: T;
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: number;
  gasPrice?: number;
  gasPriceUsd?: number;
}

export interface SwapTransaction extends Transaction {
  type: TransactionTypeEnum.swap;
  tokenIn: SwapToken;
  tokenOut: SwapToken;
}

export type FeatureName = string;

export type FeatureDto = Record<
  FeatureName,
  // | LendingFeature
  // | BorrowFeature
  // | VaultFeature
  // | ExchangeFeature
  // | BalanceFeature
  LiquidityPoolFeature[]
  // | BaseData
>;

export interface IntegrationResponse {
  [key: string]: FeatureDto;
}
