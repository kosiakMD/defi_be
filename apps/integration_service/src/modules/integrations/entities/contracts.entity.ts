import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AbisEntity } from './abis.entity';
import { ProjectsEntity } from './projects.entity';

@Entity({ name: 'int_contracts' })
export class ContractsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @OneToOne(() => AbisEntity)
  @JoinColumn({ name: 'abi_hash', referencedColumnName: 'hash' })
  @Column({ name: 'abi_hash', type: 'json' })
  abi: AbisEntity;

  @ManyToOne(() => ProjectsEntity, (project) => project.contracts)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'id' })
  @Column({ name: 'project_id', type: 'integer' })
  project: ProjectsEntity;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: number;
}
