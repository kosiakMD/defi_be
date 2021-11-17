import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ChainIdEnum } from '@app/common';

@Entity({ name: 'tracked_vault' })
export class TrackedVault {
  @PrimaryColumn({ name: 'id' })
  id: number;

  @Column({ name: 'mapping', type: 'json' })
  mapping: any;

  @Column({ name: 'feature' })
  feature: string;

  @Column({ name: 'protocol' })
  protocol: string;

  @Column({ name: 'chain_id', enum: ChainIdEnum })
  chainId: ChainIdEnum;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ name: 'update_frequency' })
  updateFrequency: number;
}
