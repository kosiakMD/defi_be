export class PoolDto {
  id: string;
  chain: string;
  projectName: string;
  reserveUSD: string;
  fee24h: string;
  APY: {
    day: number;
    week: number;
    month: number;
  };
  IL: {
    day: number;
    dayUSD: number;
    week: number;
    weekUSD: number;
    month: number;
    monthUSD: number;
  };
  poolToken: {
    id: string;
    totalSupply: number;
  };
  tokens: {
    id: string;
    name: string;
    symbol: string;
    percentage: number;
    reserve: number;
  }[];
}
