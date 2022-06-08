import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HttpModule } from '@app/common';

import { PricesController } from './prices.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  controllers: [PricesController],
})
export class PricesModule {}
