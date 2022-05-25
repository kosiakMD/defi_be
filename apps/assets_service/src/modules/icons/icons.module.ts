import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigHostModule } from '@nestjs/config/dist/config-host.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheService } from '@app/common/services/cache.service';

import { AwsModule } from '../../aws/aws.module';
import { IconSourceEntity } from './entities/icon-sources.entity';
import { IconsService } from './icons.service';
import { CoingeckoStrategy } from './strategies/coingecko.strategy';
import { CoinmarketcapStrategy } from './strategies/coinmarketcap.strategy';
import { TrustWalletStrategy } from './strategies/trust-wallet.strategy';

const iconStrategies = [CoingeckoStrategy, CoinmarketcapStrategy, TrustWalletStrategy];

@Module({
  imports: [
    AwsModule,
    TypeOrmModule.forFeature([IconSourceEntity]),
    HttpModule.registerAsync({
      imports: [ConfigHostModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout'),
        maxRedirects: configService.get<number>('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [IconsService],
  providers: [...iconStrategies, IconsService, CacheService],
})
export class IconsModule {}
