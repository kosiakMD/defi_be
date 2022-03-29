import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ProtocolChain } from './protocol.chain.entity';

@Entity({ name: 'chains' })
export class Chain {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: '256' })
  name: string;

  @OneToMany(() => ProtocolChain, (pc) => pc.chain, { eager: false })
  protocolChains: ProtocolChain[];
}
