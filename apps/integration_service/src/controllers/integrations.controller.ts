import { Controller, Get, NotAcceptableException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainsParam } from '@app/common/decorators';
import { FeaturesResponseDto } from '@app/common/dto';
import { ChainIdEnum, ProtocolNameEnum } from '@app/common/enum';

import { IntegrationsResponseDto } from '../modules/integrations/dto/integrations.dto';
import { IntegrationsService } from '../modules/integrations/integrations.service';
import { ProtocolParams } from '../modules/integrations/interfaces/integrations.interface';

@ApiTags('Protocols')
@Controller('v1/protocols')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @ApiResponse({ status: 200, type: FeaturesResponseDto })
  @Get('/')
  getAllFeatures(): FeaturesResponseDto {
    return this.integrationsService.getAllFeatures();
  }

  @ApiResponse({ status: 200 })
  @Get('active')
  getActiveFeatures() {
    return this.integrationsService.getActiveFeatures();
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    enumName: 'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum',
    example: ProtocolNameEnum.uniswapV2,
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    example: [
      ChainIdEnum.eth,
      ChainIdEnum.bsc,
      ChainIdEnum.plg,
      ChainIdEnum.ftm,
      ChainIdEnum.arbi,
      ChainIdEnum.avax,
      ChainIdEnum.xdai,
      ChainIdEnum.celo,
      ChainIdEnum.mriver,
      ChainIdEnum.harm,
      ChainIdEnum.heco,
    ].join(','),
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2',
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseDto })
  @Get('/:protocolName/')
  async getProtocolFeature(
    @Param() params: ProtocolParams,
    @Query('addresses') addresses: string,
    @ChainsParam('chains') chains: ChainIdEnum[],
  ): Promise<IntegrationsResponseDto> {
    const { protocolName } = params;
    if (!Object.values(ProtocolNameEnum).includes(protocolName)) {
      throw new NotAcceptableException(`Wrong protocol name '${protocolName}'`);
    }

    return this.integrationsService.getProtocolFeaturesData(protocolName, chains, addresses);
  }
}
