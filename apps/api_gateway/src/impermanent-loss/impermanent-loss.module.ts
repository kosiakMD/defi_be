import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ImpermanentLossController } from './impermanent-loss.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  controllers: [ImpermanentLossController],
})
export class ImpermanentLossModule {}
