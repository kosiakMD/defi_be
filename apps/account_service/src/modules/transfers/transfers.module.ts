import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceService } from '../../common/providers/microservices/price/price.service';

import { TransfersController } from '../../controllers/transfers.controller';
import { WETH } from '../approvals/contracts/WETH';
import { AssetService } from '../assets/asset.service';
import { ChainsModule } from '../chains.module';
import { ScansApiModule } from '../scans.api.module';
import { TransferEntityNew } from './entities/transfers.entity';
import { TransfersBlocksSubgraph } from './transfers.blocks.subgraph';
import { TransfersDbService } from './transfers.db.service';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([TransferEntityNew]),
    ChainsModule,
    ScansApiModule,
  ],
  controllers: [TransfersController],
  providers: [
    PriceService,
    WETH,
    AssetService,
    TransfersDbService,
    TransfersBlocksSubgraph,
    TransfersService,
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
