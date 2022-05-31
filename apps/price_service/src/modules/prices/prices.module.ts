import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PricesController } from '../../controllers/prices.controller';
import { LookupModule } from '../lookup/lookup.module';
import { PriceRepository } from '../repositories/price.repository';
import { AssetEntity } from './entities/asset.entity';
import { AssetCurrentPriceEntity } from './entities/asset_current_price.entity';
import { AssetPriceEntity } from './entities/asset_price.entity';
import { PriceService } from './prices.service';

@Module({
  imports: [
    forwardRef(() => LookupModule),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 300,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([AssetPriceEntity, AssetEntity, AssetCurrentPriceEntity]),
  ],
  controllers: [PricesController],
  providers: [PriceService, PriceRepository],
  exports: [PriceService],
})
export class PricesModule {}
