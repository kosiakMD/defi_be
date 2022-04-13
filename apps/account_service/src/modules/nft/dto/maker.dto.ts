import { Exclude, Expose } from 'class-transformer';

import { Address } from '@app/common';

@Exclude()
export class MakerDto {
  @Expose()
  address: Address = null;
}
