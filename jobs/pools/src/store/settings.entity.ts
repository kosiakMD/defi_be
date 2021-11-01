import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'settings' })
export class Settings {
  @PrimaryColumn()
  id: number;

  @Column({name: 'name', nullable: false})
  name: number;

  @Column({name: 'value', nullable: true, type: 'json'})
  value: string[] | any;

  @Column({name: 'created_at', nullable: false, type: 'timestamp'})
  createdAt: number;
}
