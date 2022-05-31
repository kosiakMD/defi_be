export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: number;
  tradeVolume: number;
  tradeVolumeUSD: number;
  untrackedVolumeUSD: number;
  txCount: number;
  totalLiquidity: number;
  derivedETH: number;
}
