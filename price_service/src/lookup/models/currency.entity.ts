import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { CurrencyEnum, CurrencyIdEnum } from 'src/common/enum';

@Entity({ name: 'currency' })
export class CurrencyDto {
  @PrimaryGeneratedColumn()
  public id: CurrencyIdEnum;

  @Column()
  public name: CurrencyEnum;
}
