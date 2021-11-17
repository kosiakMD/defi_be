import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Address, ChainIdEnum, ProtocolParams } from '@app/common';

import { Addresses, Chains } from '../decorators/params';
import { IntegrationsResponseV2Dto } from './integrations.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('Protocols')
@Controller('v2/protocols')
export class IntegrationsControllerV2 {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('/:protocolName/')
  async getProtocolFeature(
    @Param() params: ProtocolParams,
    @Addresses('addresses') addresses: Address[],
    @Chains('chains') chains: ChainIdEnum[],
  ): Promise<IntegrationsResponseV2Dto> {
    const { protocolName } = params;

    return this.integrationsService.getProtocolFeaturesDataV2(protocolName, chains, addresses);
  }
}
