import { Controller, Get } from '@nestjs/common';
import { VaultsService } from './vaults.service';

@Controller('vaults')
export class VaultsController {
	constructor(private readonly vaultsService: VaultsService) {}
	@Get()
	getDataByAddresses(): any {
		return this.vaultsService.saveVaults()
	}
}
