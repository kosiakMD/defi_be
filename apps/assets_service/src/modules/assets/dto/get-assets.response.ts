import { ApiProperty } from '@nestjs/swagger';

import { AssetDto } from './asset.dto';

export class GetAssetsResponse {
  @ApiProperty({ type: [AssetDto] })
  assets: AssetDto[];
}
