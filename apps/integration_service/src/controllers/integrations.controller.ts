import { SearchResultsEntryDto } from 'apps/api_gateway/src/common/DTO/SearchResultsEntry.dto';
import {
  SearchParams,
  SearchResultsBaseEntry,
} from 'apps/api_gateway/src/search/interfaces/search.interface';

import {
  CacheInterceptor,
  Controller,
  Get,
  HttpStatus,
  NotAcceptableException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainsParam } from '@app/common/decorators';
import { FeaturesResponseDto } from '@app/common/dto';
import { ChainIdEnum, ProtocolNameEnum } from '@app/common/enum';

import { SearchEntries } from '../common/enum/search.enum';
import { IntegrationSearchParams } from '../common/interfaces/search.interfaces';

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

  @ApiResponse({ status: HttpStatus.OK })
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
    example: '0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2',
  })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationsResponseDto })
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

  @UseInterceptors(CacheInterceptor)
  @Get('/search/:searchEntry')
  @ApiParam({
    name: 'searchEntry',
    enum: SearchEntries,
    example: SearchEntries.VAULTS,
  })
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'address to search assets by address',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: false,
  })
  @ApiQuery({
    name: 'text',
    type: String,
    description: 'text to search assets by name or symbol',
    example: 'CRO',
    required: false,
  })
  @ApiResponse({ status: HttpStatus.OK, type: [SearchResultsEntryDto] })
  async search(
    @Param() params: IntegrationSearchParams,
    @Query() query: SearchParams,
  ): Promise<SearchResultsBaseEntry[]> {
    return this.integrationsService.search(params, query);
  }
}
