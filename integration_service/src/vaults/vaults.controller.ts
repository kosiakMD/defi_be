import { Controller, Get } from '@nestjs/common';

import { VaultsResponseDto } from './dto/vaults.response.dto';
import { VaultsService } from './vaults.service';

@Controller('vaults')
export class VaultsController {
  constructor(private readonly poolsService: VaultsService) {}

  @Get()
  async getVaultsToDisplay(): Promise<VaultsResponseDto[]> {
    const vaultsEntities = await this.poolsService.getPoolsToDisplay();
    return vaultsEntities.map((entity) => new VaultsResponseDto().fromEntityToDto(entity));
  }
}
