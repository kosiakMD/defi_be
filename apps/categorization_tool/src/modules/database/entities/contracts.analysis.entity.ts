import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Contract } from './contract.entity';

@Entity({ name: 'contracts_analysis' })
export class ContractsAnalysis {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Contract, (c) => c.analysis)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'counterpart_contract_id', type: 'integer', nullable: false })
  counterpartContractId: number;

  @Column({ name: 'similarity', type: 'decimal' })
  similarity: number;
}
