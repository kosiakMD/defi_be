import { Controller, Get, Param } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Address, ChainIdEnum } from '@app/common';

import { AbiService } from '../framework/support/EVM/AbiModule/AbiService';
import { IntegrationsResponseV2Dto } from '../modules/integrations/dto/integrations.dto';

@ApiTags('Debug')
@Controller('v3/debug')
export class IntegrationsDebugController {
  constructor(protected abiService: AbiService) {}
  @ApiParam({
    name: 'chain',
    example: ChainIdEnum.ftm,
  })
  @ApiParam({
    name: 'address',
    example: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseV2Dto })
  @Get('/fetch-abi/:chain/:address')
  async fetchAbi(
    @Param() { address, chain }: { address: Address; chain: ChainIdEnum },
  ): Promise<any> {
    return this.abiService.fetchAbi(address, chain);
  }

  @ApiParam({
    name: 'chain',
    example: ChainIdEnum.ftm,
  })
  @ApiParam({
    name: 'address',
    example: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
  })
  @ApiParam({
    name: 'strategy',
    example: 'Tenderly',
  })
  @ApiResponse({ status: 200, type: IntegrationsResponseV2Dto })
  @Get('/fetch-abi/:chain/:address/:strategy')
  async fetchAbiUsingStrategy(
    @Param()
    { address, chain, strategy }: { address: Address; chain: ChainIdEnum; strategy: string },
  ): Promise<any> {
    return this.abiService.fetchAbiUsingStrategy(address, chain, strategy);
  }
}
