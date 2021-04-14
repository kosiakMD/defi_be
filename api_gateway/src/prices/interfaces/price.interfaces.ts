export interface PriceQuery {
  chain: number;
  currency: number;
  addresses: string;
  timestamps: string;
}

export interface CurrentPricesPayload {
  [key: string]: number;
}

export interface TimestampPrice {
  [key: string]: number;
}

export interface HistoricalPricesPayload {
  [key: string]: TimestampPrice;
}

export type PricesPayload<T = CurrentPricesPayload | HistoricalPricesPayload> = T;
