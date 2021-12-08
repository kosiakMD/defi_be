import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalsController } from '../../controllers/approvals.controller';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    BlacklistModule,
    TypeOrmModule.forFeature(),
    CacheModule.register(),
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
