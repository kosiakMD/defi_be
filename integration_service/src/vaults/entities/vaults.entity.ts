import { Column, Entity, PrimaryColumn } from 'typeorm';

import { APYDto } from '../dto/apy.dto';
import { TokenDto } from '../dto/token.dto';

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
  chain: number;

  @Column({ name: 'apy', nullable: true, type: 'json' })
  apy: APYDto;

  @Column({ name: 'tvl', nullable: true })
  tvl: number;

  @Column({ name: 'lp_token', nullable: true, type: 'json' })
  lpToken: TokenDto;

  @Column({ name: 'liquidity_pool_tokens', nullable: true, type: 'json' })
  liquidityPoolTokens: TokenDto[];

  @Column({ name: 'reward_token', nullable: true, type: 'json' })
  rewardToken: TokenDto;

  @Column({ name: 'created_at', nullable: true, type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true, type: 'timestamp' })
  updatedAt: Date;
}
