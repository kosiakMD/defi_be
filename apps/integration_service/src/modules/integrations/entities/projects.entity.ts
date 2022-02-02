import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FeaturesEntity } from './features.entity';

@Entity({ name: 'int_projects' })
export class ProjectsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'code' })
  code: string;

  @OneToMany(() => FeaturesEntity, (feature) => feature.project)
  features: FeaturesEntity[];

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: number;
}
