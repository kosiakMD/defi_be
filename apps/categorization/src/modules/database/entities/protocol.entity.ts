import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Link } from './link.entity';
import { ProtocolChain } from './protocol.chain.entity';
import { ProtocolProperty } from './protocol.property.entity';

@Entity({ name: 'protocols' })
export class Protocol {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: '256' })
  name: string;

  @Column({ name: 'url', type: 'varchar', length: '256' })
  url: string;

  @OneToMany(() => ProtocolChain, (pc) => pc.protocol, { eager: false })
  protocolChains: ProtocolChain[];

  @OneToMany(() => Link, (l) => l.protocol, { eager: false })
  links: Link[];

  @OneToMany(() => Link, (l) => l.protocol, { eager: true })
  props: ProtocolProperty[];
}
