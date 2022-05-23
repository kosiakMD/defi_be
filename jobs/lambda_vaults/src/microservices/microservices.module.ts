import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AccountService } from './account.service';
import { CardanoService } from './cardano.service';
import { IntegrationService } from './integration.service';
import { PriceService } from './price.service';

@Module({
  imports: [HttpModule],
  providers: [IntegrationService, AccountService, PriceService, CardanoService],
  exports: [IntegrationService, AccountService, PriceService, CardanoService],
})
export class MicroservicesModule {}
