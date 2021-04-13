import { Controller, Get } from '@nestjs/common';
import { VaultsEntity } from './entities/vaults.entity';
import { VaultsService } from './vaults.service';

@Controller('vaults')
export class VaultsController {
  constructor(
    private readonly poolsService: VaultsService
  ) {
  }

  @Get()
  getVaultsToDisplay(): Promise<VaultsEntity[]> {
    return this.poolsService.getPoolsToDisplay()
  }
}
