// eslint-disable-next-line max-classes-per-file
import { Exclude } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import {
  ChainAbbrEnum,
  FeatureEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolNameEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
} from '@app/common/enum';
import { FeatureDtoType, Features, FeaturesType, ProtocolName } from '@app/common/types';

import { StakingPositionFeatureDto } from './StakingPositionFeatureDto';
import { ChainDto } from './chain.dto';
import { LiquidityPoolFeature } from './liquidity.pool.dto';
import { ResponseDto } from './response.dto';

export class ProtocolFeaturesExportDto {
  // [FeatureEnum.pools]: FeatureDtoType;
  chain: ChainDto;
  list: FeatureEnum[];
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

// TODO: Same as
// - apps/integration_service/src/modules/integrations/dto/features.dto.ts
// - apps/api_gateway/src/common/DTO/features.dto.ts
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

  features: ProtocolFeaturesExportDto[];
}

export class FeaturesResponseDto extends ResponseDto<ProtocolDataDto[]> {
  @ApiProperty({ type: [ProtocolDataDto] })
  data: ProtocolDataDto[];
}

export class FeatureResultDto<T extends Features> {
  totalValue = 0;
  items: T[] = [];
  errors?: string[] = [];
}

export class ProtocolFeaturesDataDto /*implements ProtocolFeaturesData*/ {
  [FeatureEnum.pools]?: FeatureDtoType<LiquidityPoolFeature>;
  [FeatureEnum.staking]?: FeatureDtoType<StakingPositionFeatureDto>;
  [FeatureEnum.transactions]?: FeatureDtoType<Features>;
  [FeatureEnum.farming]?: FeatureDtoType<Features>;
}
