import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'settings' })
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', nullable: false })
  name: string;

  @Column({ name: 'value', nullable: true, type: 'json' })
  value: string[] | any;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;
}