import { ColumnType } from 'src/common/enum';
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

  @Column({ name: 'apy', nullable: true, type: ColumnType.json })
  apy: APYDto;

  @Column({ name: 'tvl', nullable: true })
  tvl: number;

  @Column({ name: 'lp_token', nullable: true, type: ColumnType.json })
  lpToken: TokenDto;

  @Column({ name: 'liquidity_pool_tokens', nullable: true, type: ColumnType.json })
  liquidityPoolTokens: TokenDto[];

  @Column({ name: 'reward_token', nullable: true, type: ColumnType.json })
  rewardToken: TokenDto;

  @Column({ name: 'created_at', nullable: true, type: ColumnType.timestamp })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true, type: ColumnType.timestamp })
  updatedAt: Date;
}
