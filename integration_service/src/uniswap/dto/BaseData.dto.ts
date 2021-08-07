import { ApiProperty } from '@nestjs/swagger';

import {
  ChainIdEnum,
  PlatformEnum,
  ProtocolName,
  ProtocolTypeEnum,
  UniswapProtocolEnum,
} from '../../common/enum';
import { BaseData } from '../../interfaces/transactions.interfaces';
import { liquidityPositionDto } from './liquidity.position.dto';

export default class BaseDataDto<T = ProtocolTypeEnum> implements BaseData<T> {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  userAddress: string;

  @ApiProperty({ enum: PlatformEnum, enumName: 'PlatformEnum', example: PlatformEnum.uniswap })
  platformName: PlatformEnum;

  @ApiProperty({ type: String, example: UniswapProtocolEnum.protocolV2, required: false })
  protocolName: ProtocolName;

  @ApiProperty({
    enum: ProtocolTypeEnum,
    enumName: 'ProtocolTypeEnum',
    example: ProtocolTypeEnum.amm,
  })
  protocolType: T;

  @ApiProperty({ type: [liquidityPositionDto] })
  liquidityPositions: liquidityPositionDto[];
}
