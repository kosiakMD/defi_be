import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('approvals')
export class ApprovalsEntity {
  @PrimaryColumn()
  id?: number;

  @Column({ name: 'user_address', nullable: false })
  userAddress: string;

  @Column({ name: 'token_address', nullable: false })
  tokenAddress: string;

  @Column({ name: 'asset_id', nullable: false })
  assetId: number;

  @Column({ name: 'amount', nullable: false })
  amount: string;

  @Column({ name: 'contract_address', nullable: false })
  contractAddress: string;

  @Column({ name: 'block_number', nullable: false })
  blockNumber: number;

  @Column({ name: 'block_timestamp', nullable: false })
  blockTimestamp: number;

  @Column({ name: 'hash', nullable: false })
  hash: string;
}
