import { Exclude, Expose } from 'class-transformer';

import { Address } from '@app/common';

@Exclude()
export class ContractDto {
  @Expose()
  address: Address = null;

  @Expose({ name: 'schema_name' })
  tokenStandard: string = null;
}
