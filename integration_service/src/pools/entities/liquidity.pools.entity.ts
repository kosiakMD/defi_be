import { Column, Entity, PrimaryColumn } from 'typeorm';

import { APY } from '../dto/apy.dto';
import { ImpermanentLoss } from '../dto/impermanentloss.dto';
import { Token } from '../dto/token.dto';

@Entity('liquidity_pools')
export class LiquidityPoolsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'address', nullable: true })
  address: string;

  @Column({ name: 'chain', nullable: true })
  chain: number;

  @Column({ name: 'project', nullable: true })
  project: string;

  @Column({ name: 'reserve_usd', nullable: true })
  reserveUsd: number;

  @Column({ name: 'apy', nullable: true, type: 'json' })
  apy: APY;

  @Column({ name: 'il', nullable: true, type: 'json' })
  il: ImpermanentLoss;

  @Column({ name: 'token', nullable: true, type: 'json' })
  token: Token;

  @Column({ name: 'pool_tokens', nullable: true, type: 'json' })
  poolTokens: Token[];

  @Column({ name: 'created_at', nullable: true, type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true, type: 'timestamp' })
  updatedAt: Date;
}
