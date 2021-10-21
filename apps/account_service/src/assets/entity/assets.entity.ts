import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';

import { AssetState, ChainIdEnum } from '@app/common/enum';

import { ColumnNumericTransformer } from '../../common/dto';

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
  chain: ChainIdEnum;

  @Column({ name: 'decimals', transformer: new ColumnNumericTransformer() })
  decimals: number;

  @Column({ name: 'is_analytic_available' })
  isAnalyticAvailable: boolean;

  @Column({ name: 'is_lp' })
  isLp: boolean;

  @Column({ name: 'is_tracked' })
  isTracked: boolean;

  status: AssetState;

  positionInPool: number;
}
