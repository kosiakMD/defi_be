import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { DbService } from './repository/db.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule.register({
      timeout: 3000,
    }),
    ChainModule,
  ],
  controllers: [BalanceController],
  providers: [BalanceService, DbService],
})
export class BalanceModule {}
