export interface SwapRequest {
  buyToken: string;
  sellToken: string;
  buyAmount: string;
  takerAddress: string;
  gasPrice: string;
  slippagePercentage;
}

export interface PricesRequest {
  from: string;
  to: string;
  amount: string;
  side: string;
  network: string;
}
