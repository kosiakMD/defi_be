import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  Address,
  AddressesArray,
  ChainIdEnum,
  ChainsArray,
  ProtocolNameEnum,
  ProtocolParams,
} from '@app/common';

import { PlatformService } from '../framework/services/platform.service';
import { IPlatformMeta } from '../framework/support/interfaces';
import {
  IOpportunityResponse,
  IUserEntryResponse,
} from '../framework/support/interfaces/responses.interface';
import { IntegrationsResponseV2Dto } from '../modules/integrations/dto/integrations.dto';

@ApiTags('Protocols')
@Controller('v3/protocols')
export class IntegrationsControllerV3 {
  constructor(private readonly platformService: PlatformService) {}

  @Get('/')
  async getProtocolList(): Promise<IPlatformMeta[]> {
    return this.platformService.getProtocolList();
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    example: ProtocolNameEnum.SpookySwap,
  })
  @ApiQuery({
    name: 'chains',
    example: [ChainIdEnum.eth, ChainIdEnum.ftm, ChainIdEnum.sol, ChainIdEnum.osmosis].join(','),
  })
  @ApiQuery({
    name: 'addresses',
    example: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseV2Dto })
  @Get('/:protocolName/')
  async getUserPositionsForProtocol(
    @Param() { protocolName }: ProtocolParams,
    @ChainsArray('chains') chains: ChainIdEnum[],
    @AddressesArray('addresses') addresses: Address[],
  ): Promise<IUserEntryResponse> {
    return this.platformService.getUserPositionsForProtocol(protocolName, chains, addresses);
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    example: ProtocolNameEnum.SpookySwap,
  })
  @ApiQuery({
    name: 'chains',
    example: [ChainIdEnum.eth, ChainIdEnum.ftm, ChainIdEnum.sol, ChainIdEnum.osmosis].join(','),
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseV2Dto })
  // TODO: not happy with this url...
  @Get('/:protocolName/opportunities')
  async getOpportunitiesForProtocol(
    @Param() { protocolName }: ProtocolParams,
    @ChainsArray('chains') chains: ChainIdEnum[],
  ): Promise<IOpportunityResponse> {
    return this.platformService.getOpportunitiesForProtocol(protocolName, chains);
  }

  @ApiParam({
    name: 'protocolName',
    enum: ProtocolNameEnum,
    example: ProtocolNameEnum.SpookySwap,
  })
  @ApiQuery({
    name: 'debug',
    type: Boolean,
    required: false,
    example: true,
  })
  @ApiQuery({
    name: 'chains',
    example: [ChainIdEnum.eth, ChainIdEnum.ftm, ChainIdEnum.sol, ChainIdEnum.osmosis].join(','),
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseV2Dto })
  // TODO: not happy with this url...
  @Get('/:protocolName/sync')
  async cacheAvailablePools(
    @Param() { protocolName }: ProtocolParams,
    @ChainsArray('chains') chains: ChainIdEnum[],
    @Query() { debug }: { debug?: string },
  ): Promise<any> {
    return this.platformService.cacheOpportunitiesForProtocol(
      protocolName,
      chains,
      debug === 'true',
    );
  }
}
