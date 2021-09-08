import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ChainIdEnum, ChainNameEnum } from 'src/common/enum';

@Entity({ name: 'chain' })
export class ChainEntity {
  @PrimaryGeneratedColumn()
  public id: ChainIdEnum;

  @Column()
  public name: ChainNameEnum;
}
