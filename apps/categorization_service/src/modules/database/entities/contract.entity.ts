import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ContractsAnalysis } from './contracts.analysis.entity';
import { Protocol } from './protocol.entity';

@Entity({ name: 'contracts' })
export class Contract {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'address', type: 'varchar', length: '256' })
  address: string;

  @Column({ name: 'abi', type: 'text' })
  abi: string;

  @Column({ name: 'abi_code', type: 'text' })
  abiCode: string;

  @Column({ name: 'chain', type: 'varchar' })
  chain: string;

  @ManyToOne(() => Protocol, (p) => p.id, { eager: true })
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;

  @OneToMany(() => ContractsAnalysis, (ca) => ca.contract)
  analysis: ContractsAnalysis[];

  @Column({ name: 'fetched_abi', type: 'boolean' })
  fetchedAbi = false;
}
