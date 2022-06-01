import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Protocol } from './protocol.entity';

@Entity({ name: 'protocols_properties' })
export class ProtocolProperty {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: '256' })
  name: string;

  @Column({ name: 'value', type: 'varchar', length: '256' })
  value: string;

  @Column({ name: 'source', type: 'varchar', length: '256' })
  source: string;

  @ManyToOne(() => Protocol, (p) => p.props)
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;
}
