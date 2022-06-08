import { Module } from '@nestjs/common';

import { HttpModule } from '@app/common';

import { IntegrationService } from './integration.service';

@Module({
  imports: [HttpModule],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class MicroservicesModule {}
