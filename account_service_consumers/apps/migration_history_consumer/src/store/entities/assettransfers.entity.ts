import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('asset_transfers')
export class AssetTransfersEntity {
  @PrimaryColumn()
  id?: number;

  @Column({ name: 'asset_id', nullable: false })
  assetId: number;

  @Column({ name: 'tx_hash', nullable: false })
  txHash: string;

  @Column({ name: 'from', nullable: false })
  from: string;

  @Column({ name: 'to', nullable: false })
  to: string;

  @Column({ name: 'decimals', nullable: false })
  value: string;

  @Column({ name: 'timestamp', nullable: false, type: 'timestamp' })
  timestamp: number;
}
