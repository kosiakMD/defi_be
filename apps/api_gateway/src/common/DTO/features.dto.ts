// eslint-disable-next-line max-classes-per-file
import { Exclude } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum, SushiSwapProtocolEnum, UniswapProtocolEnum } from '../enum';

import { FeaturesType } from '../types/protocol.types';
import { FeatureDto } from '../types/features.types';

import { ChainDto } from './chain.dto';
import { ProtocolName } from '../interfaces';
import { ResponseDto } from './response.dto';
import { ProtocolNameEnum } from '../enum/projectEnum';
import { FeatureEnum } from '@app/common';

export interface ProtocolParams {
  protocolName: ProtocolName;
  // featureName: FeatureEnum;
  // chainId: ChainIdEnum;
  // address: Address;
}


export class ProtocolFeaturesExportDto {
  // [FeatureEnum.pools]: FeatureDto;
  chain: ChainDto;
  list: FeatureEnum[];
}

export class ProtocolFeaturesDataDto /*implements ProtocolFeaturesData*/ {
  [FeatureEnum.pools]?: FeatureDto;
  [FeatureEnum.staking]?: FeatureDto;
  [FeatureEnum.transactions]?: FeatureDto;
  [FeatureEnum.farming]?: FeatureDto;
}

export class ProtocolFeaturesInfoDto {
  @ApiProperty({enum: FeatureEnum, enumName: 'FeatureEnum', isArray: true})
    // eslint-disable-next-line prettier/prettier
  [ChainAbbrEnum.eth]: FeatureEnum;

  @ApiProperty({enum: FeatureEnum, enumName: 'FeatureEnum', isArray: true})
  [ChainAbbrEnum.bsc]: FeatureEnum;

}

export class ProtocolBasicInfo {
  @ApiProperty({
    enum: ProtocolNameEnum,
    enumName: 'ProtocolName',
    example: ProtocolNameEnum.uniswapV2
  })
  name: ProtocolName;

  @ApiProperty({ enum: ProjectEnum, enumName: 'ProjectEnum', example: ProjectEnum.uniswap })
  project: ProjectEnum;

  @ApiProperty({ type: String })
  label: string;

  @ApiProperty({ enum: ChainAbbrEnum, isArray: true }) // TODO:
  chains: ChainAbbrEnum[];

  @ApiProperty({ type: ProtocolFeaturesInfoDto })
  features: FeaturesType;
}

export class ProtocolFeatureInfoDto extends ProtocolBasicInfo {
  @Exclude()
  name?: ProtocolName;
  @Exclude()
  project?: ProjectEnum;
  @Exclude()
  chains?: ChainAbbrEnum[];

  @ApiProperty({ type: ProtocolFeaturesExportDto })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line prettier/prettier
  override features: ProtocolFeaturesExportDto;
}

export class ProtocolDataDto {
  @ApiProperty({ type: ProtocolFeatureInfoDto })
  info: ProtocolFeatureInfoDto;

  @ApiProperty({
    enum: ProjectEnum,
    enumName: 'ProjectEnum',
    example: ProjectEnum.uniswap
  })
  project: ProjectEnum;

  @ApiProperty({
    enum: [PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum],
    example: UniswapProtocolEnum.uniswapV2
  })
  name: ProtocolName;
}

export class FeaturesResponseDto extends ResponseDto<ProtocolDataDto[]> {
  @ApiProperty({ type: [ProtocolDataDto] })
  data: ProtocolDataDto[];
}
