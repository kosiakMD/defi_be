import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'name', nullable: false })
  name: number;

  @Column({ name: 'value', nullable: true, type: 'json' })
  value: string[] | any;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;
}
