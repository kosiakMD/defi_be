import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { PangolinController } from './pangolin.controller';
import { PangolinService } from './pangolin.service';

@Module({
  imports: [ThegraphModule, ChainModule, PriceModule],
  controllers: [PangolinController],
  providers: [PangolinService, Mapper],
  exports: [PangolinService],
})
export class PangolinModule {}
