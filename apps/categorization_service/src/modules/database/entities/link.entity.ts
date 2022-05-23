import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { LinkTypeEnum } from '../enum/link.type.enum';
import { GithubFile } from './github.file.entity';
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

  @Column({ name: 'processed', type: 'boolean' })
  processed?: boolean = false;

  @ManyToOne(() => Protocol, (p) => p.links)
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;

  @OneToMany(() => GithubFile, (e) => e.link, { eager: false })
  githubFiles: GithubFile[];
}
