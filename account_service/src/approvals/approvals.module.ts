import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule.forFeature(), CacheModule.register()],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
