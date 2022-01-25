import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'projects_info', orderBy: { name: 'ASC' } })
export class ProjectsInfoEntity {

  @PrimaryColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'icon_project' })
  icon: string;
}
