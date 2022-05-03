import { ApiProperty } from '@nestjs/swagger';

import { NftChainsCollectionsDto } from '@app/common/dto/nft/nft.chains.collections.dto';

export class NftChainsCollectionsResponseDto {
  @ApiProperty({
    type: NftChainsCollectionsDto,
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': NftChainsCollectionsDto = null;
}
