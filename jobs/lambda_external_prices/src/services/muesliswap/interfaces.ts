export interface IToken {
  address: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  scam: boolean;
}

export interface ITokenPrice {
  tokenB: string;
  price_change_dict: {
    priceADA: number;
  };
}
