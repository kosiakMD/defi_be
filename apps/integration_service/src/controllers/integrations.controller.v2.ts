import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  Address,
  AddressesArray,
  ChainIdEnum,
  ChainsArray,
  ErrorResponseDto,
  ProtocolNameEnum,
  ProtocolParams,
} from '@app/common';

import { IntegrationsResponseV2Dto } from '../modules/integrations/dto/integrations.dto';
import { IntegrationsService } from '../modules/integrations/integrations.service';
import { IntegrationsServiceV3Decorator } from '../modules/integrations/integrations.service.v3.decorator';

@ApiTags('Protocols')
@Controller('v2/protocols')
export class IntegrationsControllerV2 {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationsServiceDecorator: IntegrationsServiceV3Decorator,
  ) {}

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
      ChainIdEnum.bnb,
      ChainIdEnum.plg,
      ChainIdEnum.ftm,
      ChainIdEnum.arbi,
      ChainIdEnum.avax,
      ChainIdEnum.gnosis,
      ChainIdEnum.celo,
      ChainIdEnum.mriver,
      ChainIdEnum.harm,
      ChainIdEnum.heco,
    ].join(','),
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
  })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationsResponseV2Dto })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, type: ErrorResponseDto })
  @Get('/:protocolName/')
  async getProtocolFeature(
    @Param() params: ProtocolParams,
    @AddressesArray('addresses') addresses: Address[],
    @ChainsArray('chains') chains: ChainIdEnum[],
  ): Promise<IntegrationsResponseV2Dto> {
    const { protocolName } = params;
    return this.integrationsServiceDecorator.getProtocolFeaturesDataV2(
      protocolName,
      chains,
      addresses,
    );
  }
}
