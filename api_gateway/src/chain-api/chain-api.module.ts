import { CacheModule, Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChainApiController } from './chain-api.controller';
import { EtherscanService } from './modules/etherscan/etherscan.service'
import { BscscanService } from './modules/bscscan/bscscan.service'

@Module({
  imports:[
    HttpModule.register({
      timeout: 30e3,
      maxRedirects: 2,
    }),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [EtherscanService, BscscanService],
  controllers: [ChainApiController],
})
export class ChainApiModule {}
