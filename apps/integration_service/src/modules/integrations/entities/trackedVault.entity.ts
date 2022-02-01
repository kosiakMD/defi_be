import { ColumnNumericTransformer } from 'apps/integration_service/src/common/dto';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ChainIdEnum, FeatureEnum } from '@app/common/enum';

@Entity({ name: 'tracked_vault', orderBy: { name: 'ASC' } })
export class TrackedVaultEntity {
  @PrimaryColumn({ name: 'id', transformer: new ColumnNumericTransformer() })
  id: number;

  @Column({ name: 'feature' })
  feature: FeatureEnum;

  @Column({ name: 'protocol' })
  name: string;

  @Column({ name: 'chain_id' })
  chainId: ChainIdEnum;
}
