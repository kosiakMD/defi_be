import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ContractsEntity } from './contracts.entity';

@Entity({ name: 'int_vaults' })
export class VaultsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => ContractsEntity, (contract) => contract.vaults)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'id' })
  @Column({ name: 'contract_id', type: 'json' })
  contract: ContractsEntity;
}
