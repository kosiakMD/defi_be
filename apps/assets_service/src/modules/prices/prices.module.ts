import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsCandidateRepository } from '../assets/repositories/assets-candidate.repository';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetsPriceEntity } from './entities/assets-price.entity';
import { PriceSourceEntity } from './entities/price-sources.entity';
import { PriceJobEmitter } from './prices-job.emitter';
import { AssetsProcessor } from './prices.processor';
import { AssetsPriceRepository } from './repositories/asset-price.repository';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'assets',
    }),
    TypeOrmModule.forFeature([
      AssetsPriceEntity,
      AssetsPriceRepository,
      PriceSourceEntity,
      AssetsRepository,
      AssetsCandidateRepository,
      PriceSourceRepository,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [PriceJobEmitter, AssetsProcessor, AssetsService],
})
export class PricesModule {}
