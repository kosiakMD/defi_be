import { Controller, Get, NotAcceptableException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FeaturesResponseDto, ProtocolParams } from '../common/DTO/features.dto';
import { IntegrationsResponseDto } from '../common/DTO/integrations.dto';
import { ChainIdEnum, UniswapProtocolEnum } from '../common/enum';
import { ProtocolNameEnum } from '../common/enum/projectEnum';

import { IntegrationService } from '../integration/integration.service';

@ApiTags('Protocols')
@Controller('protocol')
export class ProtocolController {
  constructor(private readonly integrationsService: IntegrationService) {}

  @ApiResponse({ status: 200, type: FeaturesResponseDto })
  @Get('/')
  getAllFeatures(): Promise<FeaturesResponseDto> {
    return this.integrationsService.getAllFeatures();
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    enumName:
      'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum, PangolinProtocolEnum, AutofarmProtocolEnum, AlpacaProtocolEnum',
    example: UniswapProtocolEnum.uniswapV2,
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    example: `${ChainIdEnum.eth}`,
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
    @Query('chains') chains: string,
    @Query('addresses') addresses: string,
    @Param() params: ProtocolParams,
  ): Promise<IntegrationsResponseDto> {
    const { protocolName } = params;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!Object.values(ProtocolNameEnum).includes(protocolName)) {
      throw new NotAcceptableException(`Wrong protocol name '${protocolName}'`);
    }
    return this.integrationsService.getProtocolFeaturesData(protocolName, chains, addresses);
  }
}
