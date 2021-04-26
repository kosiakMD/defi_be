import { CacheModule, Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChainApiController } from './chain-api.controller';
import { BscscanService } from './modules/bscscan/bscscan.service';
import { EtherscanService } from './modules/etherscan/etherscan.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30e3,
      maxRedirects: 2,
    }),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [BscscanService, EtherscanService],
  controllers: [ChainApiController],
})
export class ChainApiModule {}
