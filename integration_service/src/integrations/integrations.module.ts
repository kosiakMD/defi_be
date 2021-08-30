import { Module } from '@nestjs/common';

import { FeaturesService } from '../protocol/features/features.service';
import { ProtocolModule } from '../protocol/protocol.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

// TODO to add a new Protocol just add it here and at ProtocolService constructor

@Module({
  imports: [ProtocolModule],
  providers: [IntegrationsService, FeaturesService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
