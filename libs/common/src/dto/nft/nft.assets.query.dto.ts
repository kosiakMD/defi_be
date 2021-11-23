import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainIdEnum } from '@app/common';

export class NftAssetsQueryDto {
  @ApiProperty({
    type: [String],
    example: [
      '0x64850F38e800E04eF773efca8FCaFdceFe977f9D',
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
    ],
  })
  addresses: Address[];

  @ApiProperty({
    type: String,
    example: Object.values(ChainIdEnum)
      .filter((_) => typeof _ === 'number')
      .join(','),
  })
  chains: ChainIdEnum[];
}
