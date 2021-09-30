import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceModule } from '../price/price.module';
import { TransferEntityNew } from './dto/transfers.entity';
import { DbService } from './repository/db.service';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransferEntityNew]), PriceModule],
  controllers: [TransfersController],
  providers: [TransfersService, DbService],
  exports: [TransfersService],
})
export class TransfersModule {}
