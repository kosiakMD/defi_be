import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'public.endpoints' })
export class EndpointsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  endpoint: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
