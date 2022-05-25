import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'endpoints' })
export class EndpointEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  endpoint: string;

  @Column()
  chainId: number;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
