import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'currency' })
export class Currency {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;
}
