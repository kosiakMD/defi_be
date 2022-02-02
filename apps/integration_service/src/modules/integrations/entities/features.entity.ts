import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ContractsEntity } from './contracts.entity';
import { ProjectsEntity } from './projects.entity';

@Entity({ name: 'int_features' })
export class FeaturesEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'config', type: 'json' })
  config: any;

  @OneToMany(() => ContractsEntity, (contract) => contract.feature)
  contracts: ContractsEntity[];

  @ManyToOne(() => ProjectsEntity, (project) => project.features)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'id' })
  @Column({ name: 'project_id', type: 'integer' })
  project: ProjectsEntity;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: number;
}
