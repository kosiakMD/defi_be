import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceService } from '../../common/providers/microservices/price/price.service';

import { TransfersController } from '../../controllers/transfers.controller';
import { AssetService } from '../assets/asset.service';
import { ChainsModule } from '../chains.module';
import { ScansApiModule } from '../scans.api.module';
import { TransferEntityNew } from './entities/transfers.entity';
import { TransfersBlocksSubgraph } from './transfers.blocks.subgraph';
import { TransfersDbService } from './transfers.db.service';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferEntityNew]),
    ChainsModule,
    ScansApiModule,
    PriceService,
    TransfersBlocksSubgraph,
    AssetService,
    TransfersDbService,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
