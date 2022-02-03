// eslint-disable-next-line max-classes-per-file
import { Exclude } from "class-transformer";

import { ApiProperty } from "@nestjs/swagger";

import { FeatureDtoType, FeatureEnum, Features, ProtocolName } from "@app/common";
import { ChainDto } from "@app/common/dto/chain.dto";
import {
  ChainAbbrEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolNameEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum
} from "@app/common/enum";

import { FeaturesType } from "../../../common/types/protocol.types";

export class ProtocolFeaturesExportDto {
  chain: ChainDto;
  list: FeatureEnum[];
  active: FeatureDtoType<Features>
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
  features: ProtocolFeaturesExportDto;
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

  features: ProtocolFeaturesExportDto[];
}
