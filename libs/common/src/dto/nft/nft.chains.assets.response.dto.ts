import { ApiProperty } from '@nestjs/swagger';

import { NftChainsAssetsDto } from '@app/common/dto/nft/nft.chains.assets.dto';

export class NftChainsAssetsResponseDto {
  @ApiProperty({
    type: NftChainsAssetsDto,
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': NftChainsAssetsDto = null;
}
