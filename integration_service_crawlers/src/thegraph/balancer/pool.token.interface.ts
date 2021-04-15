export interface PoolToken {
  id: string;
  pool: string;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  balance: number;
  denormWeight: number;
}
