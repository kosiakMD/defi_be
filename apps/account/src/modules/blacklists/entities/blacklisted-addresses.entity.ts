import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'addresses_blacklisted' })
export class BlacklistedAddressesEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  address: string;

  @Column()
  comment: string;

  @Column()
  // eslint-disable-next-line camelcase
  created_at: Date;
}
