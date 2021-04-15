import { Column, Entity, PrimaryColumn } from 'typeorm';

import { APY } from '../dto/apy.dto';
import { Token } from '../dto/token.dto';

@Entity('vaults')
export class VaultsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'vault_id', nullable: true })
  vaultId: string;

  @Column({ name: 'vault_name', nullable: true })
  vaultName: string;

  @Column({ name: 'project', nullable: true })
  project: string;

  @Column({ name: 'chain', nullable: true })
  chain: string;

  @Column({ name: 'apy', nullable: true, type: 'json' })
  apy: APY;

  @Column({ name: 'tvl', nullable: true })
  tvl: number;

  @Column({ name: 'lp_token', nullable: true, type: 'json' })
  lpToken: Token;

  @Column({ name: 'liquidity_pool_tokens', nullable: true, type: 'json' })
  liquidityPoolTokens: Token[];

  @Column({ name: 'reward_token', nullable: true, type: 'json' })
  rewardToken: Token;

  @Column({ name: 'created_at', nullable: true, type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true, type: 'timestamp' })
  updatedAt: Date;
}
