import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { ScanApiModule } from '../scan_api/scan.api.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { DbService } from './repository/db.service';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [TypeOrmModule.forFeature(), ChainModule, ScanApiModule, PriceModule, ThegraphModule],
  controllers: [TransfersController],
  providers: [TransfersService, DbService],
})
export class TransfersModule {}
