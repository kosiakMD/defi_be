import { ChainIdEnum, CurrencyIdEnum } from '@app/common';
import { PriceSourcePriority } from '@app/common/enum/price.enum';

export type TimestampPrice = {
  timestamp: number;
  price: number;
};
export type AssetPrices = {
  address: string;
  prices: Array<TimestampPrice>;
};
export type CurrentPrice = {
  address: string;
  value: number;
};
export type PriceRow = {
  address: string;
  timestamp: number;
  value: string;
};
export type AssociatedAssetPrice = {
  assetId: number;
  address: string;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
  value: number;
  sourceId: PriceSourcePriority;
};
