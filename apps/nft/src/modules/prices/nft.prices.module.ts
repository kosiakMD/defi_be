import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HttpModule } from '@app/common';

import { NftPricesService } from './nft.prices.service';
import { LooksrarePricesProvider } from './providers/looksrare.prices.provider';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [LooksrarePricesProvider, NftPricesService],
  exports: [NftPricesService],
})
export class NftPricesModule {}
