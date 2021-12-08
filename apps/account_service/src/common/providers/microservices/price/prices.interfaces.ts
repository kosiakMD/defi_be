export interface CurrentTokensPrices {
  price: number;
  platform: string;
  isLp: boolean;
}

export interface CurrentPricesPayloadNew {
  [key: string]: CurrentTokensPrices;
}
