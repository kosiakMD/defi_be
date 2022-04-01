import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @ManyToOne(() => Protocol, (p) => p.id, { eager: true })
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;
}
