import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ProjectsInfoEntity } from './projectsInfo.entity';

@Entity({ name: 'projects_contract', orderBy: { name: 'ASC' } })
export class ProjectsContractEntity {

  @PrimaryColumn({ name: 'id' })
  id: number;

  @OneToOne(() => ProjectsInfoEntity)
  @JoinColumn()
  @Column({ name: 'project_id' })
  projectId: number;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'description' })
  symbol: string;
}
