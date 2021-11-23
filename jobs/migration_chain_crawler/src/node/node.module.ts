import { HttpModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainModule } from '../chain/chain.module';
import { BscService } from './bsc.service';
import { EthService } from './eth.service';

@Module({
  imports: [HttpModule, ConfigService, ChainModule],
  providers: [EthService, BscService],
  exports: [EthService, BscService],
})
export class NodeModule {}
