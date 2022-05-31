import { Controller, Get, HttpStatus, NotAcceptableException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FeaturesResponseDto, ProtocolParams } from '../common/dto/features.dto';
import { IntegrationsResponseDto } from '../common/dto/integrations.dto';
import { ChainIdEnum, UniswapProtocolEnum } from '../common/enum';
import { ProtocolNameEnum } from '../common/enum/project.enum';
import { BaseService } from '../common/services/base.service';

@ApiTags('Protocols')
@Controller('v1/protocol')
export class ProtocolController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('INTEGRATION_SERVICE_HOST'),
    this.configService.get<string>('INTEGRATION_SERVICE_PORT'),
  );

  @ApiResponse({ status: HttpStatus.OK, type: FeaturesResponseDto })
  @Get('/')
  getAllFeatures(): Promise<FeaturesResponseDto> {
    return this.requestProxy(this.url + 'v1/protocols');
  }

  @ApiResponse({ status: HttpStatus.OK, type: FeaturesResponseDto })
  @Get('/active')
  getAllActiveFeatures(): Promise<FeaturesResponseDto> {
    return this.requestProxy(this.url + 'v1/protocols/active');
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    enumName:
      'PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum, PangolinProtocolEnum, SpookySwapProtocolEnum, QuickswapProtocolEnum',
    example: UniswapProtocolEnum.uniswapV2,
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
    ].join(','),
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2',
  })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationsResponseDto })
  @Get('/:protocolName/')
  async getProtocolFeature(
    @Query('chains') chains: string,
    @Query('addresses') addresses: string,
    @Param() params: ProtocolParams,
  ): Promise<IntegrationsResponseDto> {
    const { protocolName } = params;
    if (!Object.values(ProtocolNameEnum).includes(protocolName)) {
      throw new NotAcceptableException(`Wrong protocol name '${protocolName}'`);
    }
    const url = this.url + 'v1/protocols' + `/${protocolName}/`;
    return this.requestProxy(url, 'GET', { params: { chains, addresses } });
  }
}
