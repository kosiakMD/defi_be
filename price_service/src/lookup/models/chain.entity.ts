import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ChainIdEnum, ChainNameEnum } from '../../common/enum';

@Entity({ name: 'chain' })
export class ChainDto {
  @PrimaryGeneratedColumn()
  public id: ChainIdEnum;

  @Column()
  public name: ChainNameEnum;
}
