import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ProtocolChain } from './protocol.chain.entity';

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

  @Column({ name: 'protocols_chains_id', type: 'int' })
  protocolsChainsId: number;

  @ManyToOne(() => ProtocolChain, (pc) => pc.id, { eager: true })
  @JoinColumn({ name: 'protocols_chains_id' })
  protocolChain: ProtocolChain;
}
