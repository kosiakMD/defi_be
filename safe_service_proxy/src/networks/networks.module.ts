import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { NetworksController } from './networks.controller';
import { NetworksService } from './networks.service';

@Module({
  imports: [HttpModule],
  controllers: [NetworksController],
  providers: [NetworksService],
})
export class NetworksModule {}
