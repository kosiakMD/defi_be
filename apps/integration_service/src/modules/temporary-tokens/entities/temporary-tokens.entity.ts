import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('temporary_tokens')
export class TemporaryTokensEntity {
  @PrimaryColumn({ name: 'address' })
  address: string;

  @Column({ name: 'rank' })
  rank: number;

  @Column({ name: 'price_usd' })
  priceUsd: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'network' })
  network: string;
}
