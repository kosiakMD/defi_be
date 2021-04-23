interface Chain {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  name: string;
}

export interface PriceServiceResponse {
  prices: any;
  chain: Chain;
  currency: Currency;
}
