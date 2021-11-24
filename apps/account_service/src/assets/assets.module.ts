import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { AssetsController } from './assets.controller';
import { AssetsPoolsService } from './assets.pools.service';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entity/assets.entity';
import { AssetsPoolsEntity } from './entity/assets.pools.entity';

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
    ChainModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsPoolsService],
  exports: [AssetsService],
})
export class AssetsModule {}
