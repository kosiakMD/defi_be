import { Controller, Get, NotAcceptableException, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Address, ProtocolNameEnum } from '@app/common';

import { ProtocolParams } from '../common/DTO/features.dto';
import { IntegrationsResponseDto } from '../common/DTO/integrations.dto';
import { ChainIdEnum, UniswapProtocolEnum } from '../common/enum';
import { BaseService } from '../common/services/base.service';

@ApiTags('Protocols')
@Controller('v2/protocol')
export class ProtocolControllerV2 extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('INTEGRATION_SERVICE_HOST'),
    this.configService.get<string>('INTEGRATION_SERVICE_PORT'),
  );

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
      ChainIdEnum.bsc,
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
  @ApiResponse({ status: 200, type: IntegrationsResponseDto })
  @Get('/:protocolName/')
  async getProtocolFeatureV2(
    @Query('chains') chains: string,
    @Query('addresses') addresses: Address[],
    @Param() params: ProtocolParams,
  ): Promise<IntegrationsResponseDto> {
    const { protocolName } = params;
    if (!Object.values(ProtocolNameEnum).includes(protocolName)) {
      throw new NotAcceptableException(`Wrong protocol name '${protocolName}'`);
    }
    return this.requestProxy(this.url + `v2/protocols/${protocolName}`, 'GET', {
      params: { chains, addresses },
    });
  }
}
