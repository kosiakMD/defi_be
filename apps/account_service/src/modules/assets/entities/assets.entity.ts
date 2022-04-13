import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';

import { ColumnNumericTransformer } from '../../../common/dto';
import { AssetState } from '../../../common/interfaces/assets.interface';

@Entity({ name: 'assets_new', orderBy: { name: 'ASC' } })
export class AssetsEntity {
  @AfterLoad()
  setStatus(): void {
    this.status = this.isAnalyticAvailable ? AssetState.ready : AssetState.pending;
  }

  @PrimaryColumn({ name: 'id', transformer: new ColumnNumericTransformer() })
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

  @Column({ name: 'decimals', transformer: new ColumnNumericTransformer() })
  decimals: number;

  @Column({ name: 'is_analytic_available' })
  isAnalyticAvailable: boolean;

  @Column({ name: 'is_lp' })
  isLp: boolean;

  @Column({ name: 'is_tracked' })
  isTracked: boolean;

  @Column({ name: 'extensions', type: 'json' })
  extensions: any;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: string;

  status: AssetState;

  positionInPool: number;
}
