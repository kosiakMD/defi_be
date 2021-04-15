import { Token } from './token.interface';

export interface Pool {
  id: string;
  name: string;
  coinCount: number;
  poolTokenSupply: number;
  virtualPrice: string;
  balances: string[];
  poolToken: Token;
  coins: Token[];
  assignedCoins: string;
  stakingPool: string;
}
