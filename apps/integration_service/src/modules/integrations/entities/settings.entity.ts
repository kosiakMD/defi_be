import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'int_settings' })
export class SettingsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'value', type: 'json' })
  value: string[] | any;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: number;
}
