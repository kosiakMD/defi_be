import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

export class NftCollectionBaseDto {
  @ApiProperty({ example: 1 })
  chainId: number;

  @ApiProperty({ example: ['0x64850F38e800E04eF773efca8FCaFdceFe977f9D'] })
  wallets: string[];

  @ApiProperty({ example: 'Super Shiba Club' })
  name: string = null;

  @ApiProperty({ example: 'TES' })
  symbol: string = null;

  @ApiProperty({
    example:
      'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
  })
  description: string = null;

  @ApiProperty({ example: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39', required: false })
  address?: Address = null;
}
