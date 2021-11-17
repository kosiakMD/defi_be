import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { AlpacaApiService } from './services/alpaca.api.service';
import { AlpacaService } from './services/alpaca.service';
import { AlpacaSubgraph } from './services/alpaca.subgraph';

@Module({
  imports: [HttpModule, MicroservicesModule, ChainModule],
  providers: [AlpacaService, AlpacaSubgraph, AlpacaApiService],
  exports: [AlpacaService],
})
export class AlpacaModule {}
