import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AccountService } from './account.service';
import { IntegrationService } from './integration.service';
import { PriceService } from './price.service';

@Module({
  imports: [HttpModule],
  providers: [IntegrationService, AccountService, PriceService],
  exports: [IntegrationService, AccountService, PriceService],
})
export class MicroservicesModule {}
