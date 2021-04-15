import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { DbService } from './repository/db.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  controllers: [BalanceController],
  providers: [BalanceService, DbService],
})
export class BalanceModule {}
