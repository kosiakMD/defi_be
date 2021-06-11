import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'assets', orderBy: { name: 'ASC' } })
export class AssetsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'icon' })
  icon: string;

  @Column({ name: 'chain_id' })
  chain: number;

  @Column({ name: 'decimals' })
  decimals: number;

  @Column({ name: 'is_ready_to_migrate' })
  isReadyToMigrate: boolean;

  @Column({ name: 'is_migrated' })
  isMigrated: boolean;

  @Column({ name: 'is_lp' })
  isLp: boolean;
}
