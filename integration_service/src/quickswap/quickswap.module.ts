import { Logger } from 'src/Logger/Logger.service';
import { AccountModule } from 'src/account/account.module';
import { ThegraphModule } from 'src/thegraph/thegraph.module';

import { Module } from '@nestjs/common';

import { QuickswapService } from './quickswap.service';

@Module({
  imports: [AccountModule, ThegraphModule],
  providers: [QuickswapService, Logger],
  exports: [QuickswapService],
})
export class QuickswapModule {}
