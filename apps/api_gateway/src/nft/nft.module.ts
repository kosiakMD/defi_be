import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IntegrationService } from '../integration/integration.service';
import { NftController } from './nft.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [IntegrationService],
  controllers: [NftController],
})
export class NftModule {}
