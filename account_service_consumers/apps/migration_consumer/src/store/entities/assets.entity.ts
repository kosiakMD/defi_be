import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('assets_new')
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

  @Column({ name: 'chain_id', nullable: true })
  chainId: number;

  @Column({ name: 'is_lp', nullable: true })
  isLp: boolean;

  @Column({ name: 'project_id', nullable: true })
  projectId: boolean;

  @Column({ name: 'is_display', nullable: true, default: false })
  isDisplay: boolean;
}
