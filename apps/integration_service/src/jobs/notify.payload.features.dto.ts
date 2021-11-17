// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, FeatureEnum, ProtocolName } from '@app/common';

export class NotifyPayloadFeaturesDto {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureEnum.pools;
  items: any[];
}

export class SavePoolsResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success: boolean;
  @ApiProperty({ type: Number, example: 9 })
  count: number;
}
