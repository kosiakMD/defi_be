import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HttpModule } from '@app/common';

import { ImpermanentLossController } from './impermanent-loss.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  controllers: [ImpermanentLossController],
})
export class ImpermanentLossModule {}
