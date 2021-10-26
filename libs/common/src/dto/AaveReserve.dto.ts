export class AaveReserve {
  id: string = null; // reserve ID

  // underlying token
  underlyingAsset: string = null;
  symbol: string = null;
  decimals: number = null;
  name: string = null;
  priceUSD?: number = null;
  price?: { priceInEth: number };

  // APY/APR calculations
  liquidityRate: string = null;
  stableBorrowRate: string = null;
  variableBorrowRate: string = null;
  aEmissionPerSecond: string = null;
  vEmissionPerSecond: string = null;
  sEmissionPerSecond: string = null;
  totalATokenSupply: string = null;
  totalCurrentVariableDebt: string = null;
}
