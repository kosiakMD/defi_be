import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { ApprovalsController } from '../../controllers/approvals.controller';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains/chains.module';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    BlacklistModule,
    TypeOrmModule.forFeature(),
    CacheModule.register(),
    ChainsModule,
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
