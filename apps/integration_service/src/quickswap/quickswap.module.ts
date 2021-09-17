import { Module } from '@nestjs/common';

import { Logger } from '@app/common/Logger/Logger.service';

import { AccountModule } from '../account/account.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { QuickswapController } from './quickswap.controller';
import { QuickswapService } from './quickswap.service';

@Module({
  imports: [AccountModule, ThegraphModule, Logger],
  providers: [QuickswapService],
  controllers: [QuickswapController],
  exports: [QuickswapService],
})
export class QuickswapModule {}
