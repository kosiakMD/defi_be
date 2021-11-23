import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('asset_transfers_new')
export class AssetTransfersEntity {
  @PrimaryColumn()
  id?: number;

  @Column({ name: 'asset_id', nullable: false })
  assetId: number;

  @Column({ name: 'from', nullable: false })
  from: string;

  @Column({ name: 'to', nullable: false })
  to: string;

  @Column({ name: 'value', nullable: false })
  value: string;

  @Column({ name: 'timestamp', nullable: false, type: 'timestamp' })
  timestamp: number;

  @Column({ name: 'tx_hash', nullable: false })
  txHash: string;

  @Column({ name: 'block_number', nullable: false })
  blockNumber: number;

  @Column({ name: 'log_index', nullable: false })
  logIndex: number;
}
