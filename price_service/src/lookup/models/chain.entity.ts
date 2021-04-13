import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'chain' })
export class Chain {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;
}
