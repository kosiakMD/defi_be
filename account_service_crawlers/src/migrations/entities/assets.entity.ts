import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('assets')
export class AssetsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'address', nullable: false })
  address: string;

  @Column({ name: 'name', nullable: true })
  name: number;

  @Column({ name: 'symbol', nullable: true })
  symbol: string;

  @Column({ name: 'decimals', nullable: false })
  decimals: number;

  @Column({ name: 'icon', nullable: true })
  icon: string;

  @Column({ name: 'is_import_started', nullable: false, default: false })
  isImportStarted: boolean;

  @Column({ name: 'is_ready_to_migrate', nullable: false, default: false })
  isReadyToMigrate: boolean;

  @Column({ name: 'is_historical_data_migrated', nullable: false, default: false })
  isHistoricalDataMigrated: boolean;

  @Column({ name: 'from_block', nullable: false })
  fromBlock: number;

  @Column({ name: 'to_block', nullable: false })
  toBlock: number;

  @Column({ name: 'migration_chunk_size', nullable: false })
  migrationChunkSize: number;

  @Column({ name: 'chain_id', nullable: true })
  chainId: number;

  @Column({ name: 'template', nullable: true })
  template: string;

  @Column({ name: 'total_transfers_count', nullable: false, type: 'numeric', default: 0 })
  totalTransfersCount: number;
}
