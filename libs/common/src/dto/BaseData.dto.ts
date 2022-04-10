import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ProjectEnum, ProtocolTypeEnum, UniswapProtocolEnum } from '../enum';
import { BaseData } from '../interfaces';
import { LiquidityPositionDto } from './LiquidityPositions.dto';
import { StakingPositionFeatureDto } from './StakingPositionFeatureDto';
import { ProtocolName } from '../types';

export default class BaseDataDto<T = ProtocolTypeEnum> implements BaseData<T> {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b' })
  @IsString()
  userAddress: string;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.uniswap })
  projectName: ProjectEnum;

  @ApiProperty({
    enum: UniswapProtocolEnum,
    enumName: 'UniswapProtocolEnum',
    example: UniswapProtocolEnum.uniswapV2,
    required: false,
  })
  @IsString()
  protocolName: ProtocolName;

  @ApiProperty({
    enum: ProtocolTypeEnum,
    enumName: 'ProtocolTypeEnum',
    example: ProtocolTypeEnum.amm,
  })
  @IsString()
  protocolType: T;

  @ApiProperty({ type: [StakingPositionFeatureDto], required: false })
  stakingPositions?: any[];

  @ApiProperty({ type: [LiquidityPositionDto], required: false })
  liquidityPositions?: LiquidityPositionDto[];
}
