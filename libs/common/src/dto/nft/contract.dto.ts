import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

@Exclude()
export class ContractDto {
  @Expose()
  @ApiProperty({ example: '0x48c58b8496642bc4c860c7efc13813b73aa674f7' })
  address: Address;

  @Expose({ name: 'image_url' })
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/RYF4Gc-9EcE7g_sbl3Aiaux5jkuq9DAe6pRe9PC7FUkFpsUAT1y3CLW-v75uJmKOXM2ST0WH-tnMvSPuvfCzBJLKY64FbthSSZwD=s120',
  })
  imageUrl: string;

  @Expose()
  @ApiProperty({ example: 'Super Shiba Club', required: false })
  name?: string;
}
