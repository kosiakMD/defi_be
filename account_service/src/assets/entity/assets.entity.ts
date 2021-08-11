import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';

import { ColumnNumericTransformer } from '../../common/dto';
import { ChainIdEnum } from 'src/common/enum';

import { AssetState } from '../assets.interface';

@Entity({ name: 'assets_new', orderBy: { name: 'ASC' } })
export class AssetsEntity {
  @AfterLoad()
  setStatus(): void {
    this.status = this.isReadyToMigrate && this.isMigrated ? AssetState.ready : AssetState.pending;
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

  @Column({ name: 'is_ready_to_migrate' })
  isReadyToMigrate: boolean;

  @Column({ name: 'is_migrated' })
  isMigrated: boolean;

  @Column({ name: 'is_lp' })
  isLp: boolean;

  status: AssetState;
}
