import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { InvestmentTokensDto } from '../dtos/investment.tokens.dto';
import { FarmEntity } from './farm.entity';

@Entity({ name: 'opportunities' })
export class OpportunityEntity extends BaseEntity {
  @ManyToOne(() => FarmEntity, (farm) => farm.opportunities)
  farm: FarmEntity;

  @Column({ name: 'chain_id' })
  chainId: number;

  @Column({ type: 'float8', nullable: true })
  apr: number;

  @Column({ type: 'float8', nullable: true })
  apy: number;

  @Column({ name: 'investment_url', type: 'float8', nullable: true })
  investmentUrl: string;

  @Column({ name: 'total_value_locked', nullable: true })
  totalValueLocked: number;

  @Column({
    type: 'jsonb',
    array: false,
  })
  tokens!: InvestmentTokensDto;

  @Column()
  source: string; // internal, vfat, multifarm, coindix...

  @Column({ name: 'source_id' })
  sourceId: string;
}
