import { ApiProperty } from '@nestjs/swagger';

import { AssetDto } from './asset.dto';

export class GetAssetResponse {
  @ApiProperty({ type: AssetDto })
  asset: AssetDto;
}
