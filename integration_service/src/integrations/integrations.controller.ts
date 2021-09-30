import { Controller, Get, NotAcceptableException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum, ProtocolNameEnum } from '../common/enum';

import { Chains } from '../decorators';
import { FeaturesResponseDto } from '../protocol/features/features.dto';
import { IntegrationsResponseDto } from './integrations.dto';
import { ProtocolParams } from './integrations.interface';
import { IntegrationsService } from './integrations.service';

@ApiTags('Protocols')
@Controller('protocols')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @ApiResponse({ status: 200, type: FeaturesResponseDto })
  @Get('/')
  getAllFeatures(): FeaturesResponseDto {
    return this.integrationsService.getAllFeatures();
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    enumName: 'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum',
    // example: UniswapProtocolEnum.uniswapV2,
    example: ProtocolNameEnum.sushiswapV2,
  })
  @ApiQuery({
    name: 'chains',
    type: Number,
    // enum: ChainIdEnum,
    isArray: true,
    // enumName: 'ChainIdEnum',
    example: [ChainIdEnum.eth],
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    // example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974
    example: '0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2',
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseDto })
  @Get('/:protocolName/')
  async getProtocolFeature(
    @Param() params: ProtocolParams,
    @Query('addresses') addresses: string,
    @Chains('chains') chains: ChainIdEnum[],
  ): Promise<IntegrationsResponseDto> {
    const { protocolName } = params;
    if (!Object.values(ProtocolNameEnum).includes(protocolName)) {
      throw new NotAcceptableException(`Wrong protocol name '${protocolName}'`);
    }
    return this.integrationsService.getProtocolFeaturesData(protocolName, chains, addresses);
  }
}
