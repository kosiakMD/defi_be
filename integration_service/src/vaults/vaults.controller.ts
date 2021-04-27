import { Controller, Get } from '@nestjs/common';
import { VaultsService } from './vaults.service';
import { VaultsResponseDto } from './dto/vaults.response.dto';

@Controller('vaults')
export class VaultsController {
  constructor(private readonly poolsService: VaultsService) {}

  @Get()
  async getVaultsToDisplay(): Promise<VaultsResponseDto[]> {
    const vaultsEntities = await this.poolsService.getPoolsToDisplay();
    return vaultsEntities.map(entity => new VaultsResponseDto().fromEntityToDto(entity));
  }
}
