import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbService } from './repository/db.service';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [TypeOrmModule.forFeature()],
  controllers: [TransfersController],
  providers: [TransfersService, DbService],
})
export class TransfersModule {}
