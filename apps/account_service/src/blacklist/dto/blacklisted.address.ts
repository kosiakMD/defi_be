import { Expose } from 'class-transformer';

export class BlacklistedAddress {
  id: string;
  address: string;
  comment: string;
  @Expose({
    // eslint-disable-next-line camelcase
    name: 'created_at',
  })
  createdAt: Date;
}
