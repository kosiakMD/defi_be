import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PricesController } from './prices.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  controllers: [PricesController],
})
export class PricesModule {}
