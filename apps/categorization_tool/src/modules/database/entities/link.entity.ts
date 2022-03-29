import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { LinkTypeEnum } from '../enum/link.type.enum';
import { Protocol } from './protocol.entity';

@Entity({ name: 'links' })
export class Link {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'url', type: 'varchar', length: '2048' })
  url: string;

  @Column({ name: 'type', type: 'enum', enum: LinkTypeEnum })
  type: LinkTypeEnum;

  @Column({ name: 'html', type: 'text' })
  html: string;

  @ManyToOne(() => Protocol, (p) => p.links)
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;
}
