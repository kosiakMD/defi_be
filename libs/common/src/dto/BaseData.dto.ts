import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ProtocolName } from '@app/common';

import { ChainIdEnum, ProjectEnum, ProtocolTypeEnum, UniswapProtocolEnum } from '../enum';
import { BaseData, StakingPosition, txs } from '../interfaces';
import { LiquidityPositionDto } from './LiquidityPositions.dto';
import { StakingPositionDto } from './StakingPosition.dto';
import { txsDto } from './txs.dto';

export default class BaseDataDto<T = ProtocolTypeEnum> implements BaseData<T> {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b' })
  @IsString()
  userAddress: string;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.uniswap })
  platformName: ProjectEnum;

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

  @ApiProperty({ type: [StakingPositionDto], required: false })
  stakingPositions?: StakingPosition[];

  @ApiProperty({ type: [LiquidityPositionDto], required: false })
  liquidityPositions?: LiquidityPositionDto[];

  @ApiProperty({ type: [txsDto], required: false })
  txs?: txs[];
}
