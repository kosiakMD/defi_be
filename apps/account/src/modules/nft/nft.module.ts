import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PriceService } from '../../common/providers/microservices/price/price.service';

import { NftController } from '../../controllers/nft.controller';
import { ChainsModule } from '../chains/chains.module';
import { AavegotchiService } from './aavegotchi.service';
import { NftService } from './nft.service';
import { OpenSeaService } from './open.sea.service';
import { AavegotchiSubgraph } from './subgraphes/aavegotchi/aavegotchi.subgraph';

@Module({
  imports: [
    HttpModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    ChainsModule,
  ],
  providers: [PriceService, NftService, OpenSeaService, AavegotchiService, AavegotchiSubgraph],
  controllers: [NftController],
})
export class NftModule {}
