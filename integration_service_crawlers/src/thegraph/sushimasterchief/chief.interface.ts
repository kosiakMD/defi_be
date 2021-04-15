import { Pool } from './pool.interface';

export interface Chief {
  id: string;
  bonusMultiplier: number;
  bonusEndBlock: number;
  devaddr: string;
  migrator: string;
  owner: string;
  startBlock: number;
  sushi: string;
  sushiPerBlock: number;
  totalAllocPoint: number;
  pools: Pool[];
  poolCount: number;
  slpBalance: number;
  slpAge: number;
  slpAgeRemoved: number;
  slpDeposited: number;
  slpWithdrawn: number;
  updatedAt: number;
}
