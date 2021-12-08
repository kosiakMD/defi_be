import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsController } from '../../controllers/assets.controller';
import { ChainsModule } from '../chains.module';
import { AssetsPoolsService } from './assets.pools.service';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsPoolsEntity } from './entities/assets.pools.entity';
import { AssetsRepository } from './repositories/assets.repository';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_ASSETS_CACHE_TTL') || 900,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([AssetsEntity, AssetsRepository, AssetsPoolsEntity]),
    forwardRef(() => ChainsModule),
  ],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsPoolsService],
  exports: [AssetsService],
})
export class AssetsModule {}
