import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Link } from './link.entity';

@Entity({ name: 'github_files' })
export class GithubFile {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'path', type: 'varchar', length: '256' })
  path: string;

  @Column({ name: 'download_url', type: 'varchar', length: '256' })
  downloadUrl: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @ManyToOne(() => Link, (p) => p.githubFiles)
  @JoinColumn({ name: 'link_id' })
  link: Link;
}
