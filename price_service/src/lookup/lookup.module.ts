import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainController } from './chain.controller';
import { CurrencyController } from './currency.controller';
import { Chain, Currency } from './models';
import { ChainService } from './services/chain.service';
import { CurrencyService } from './services/currency.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 60 * 24,
    }),
    TypeOrmModule.forFeature([Chain, Currency]),
  ],
  controllers: [ChainController, CurrencyController],
  providers: [ChainService, CurrencyService],
  exports: [ChainService, CurrencyService],
})
export class LookupModule {}
