import { ApiProperty } from '@nestjs/swagger';
import { CollectionChainsDto } from './collection.chains.dto';

export class NftCollectionsResponseDto {
  @ApiProperty({
    type: CollectionChainsDto,
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': CollectionChainsDto = null;
}
