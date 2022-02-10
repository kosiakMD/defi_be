import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { IntegrationService } from './integration.service';

@Module({
  imports: [HttpModule],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class MicroservicesModule {}
