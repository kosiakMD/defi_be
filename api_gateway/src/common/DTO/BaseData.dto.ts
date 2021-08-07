import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { ChainIdEnum, PlatformEnum, ProtocolTypeEnum, UniswapProtocolEnum } from '../enum';
import { BaseData, ProtocolName } from '../interfaces';

export default class BaseDataDto<T = ProtocolTypeEnum> implements BaseData<T> {
  @ApiProperty({ type: Number, example: 1 })
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b' })
  @IsString()
  userAddress: string;

  @ApiProperty({ enum: PlatformEnum, enumName: 'PlatformEnum', example: PlatformEnum.uniswap })
  platformName: PlatformEnum;

  @ApiProperty({ type: String, example: UniswapProtocolEnum.protocolV2, required: false })
  @IsString()
  protocolName: ProtocolName;

  @ApiProperty({
    enum: ProtocolTypeEnum,
    enumName: 'ProtocolTypeEnum',
    example: ProtocolTypeEnum.amm,
  })
  @IsString()
  protocolType: T;
}
