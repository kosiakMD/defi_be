import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5e3,
      maxRedirects: 2,
    }),
    TypeOrmModule.forFeature(),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
