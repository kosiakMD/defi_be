import { APY } from './apy.dto';
import { ImpermanentLoss } from './impermanentloss.dto';
import { Token } from './token.dto';

export class LiquidityPool {
  id: string;
  chain: number;
  project: string;
  reserveUSD: number;
  fee24h: number;
  apy: APY;
  il?: ImpermanentLoss;
  poolToken: Token;
  tokens: Token[];
  createdAt?: string;
  updatedAt?: string;
}
