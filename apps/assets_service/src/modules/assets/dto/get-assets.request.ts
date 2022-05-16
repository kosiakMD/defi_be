import { ApiProperty } from '@nestjs/swagger';

import { GetAssetRequest } from './get-asset.request';

export class GetAssetsRequest {
  @ApiProperty({ type: [GetAssetRequest] })
  assets: GetAssetRequest[];
}
