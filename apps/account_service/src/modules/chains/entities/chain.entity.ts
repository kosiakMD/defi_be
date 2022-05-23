import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';
import { IChainMetadata } from '@app/common/interfaces/chain.metadata.interface';

import { ChainTypeEnum } from '../enums/chain-type.enum';

@Entity('chains')
export class ChainsEntity extends BaseEntity {
  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public abbr: string;

  @Column({ nullable: true })
  public icon: string;

  @Column({
    type: 'enum',
    enum: ChainTypeEnum,
    enumName: 'chain_type',
    nullable: true,
    default: ChainTypeEnum.EVM,
  })
  public type: ChainTypeEnum;

  @Column({ type: 'json', nullable: false })
  public metadata: IChainMetadata;
}
