import { CacheModule, Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BscscanService } from './modules/bscscan/bscscan.service';
import { EtherscanService } from './modules/etherscan/etherscan.service';
// import { ScanService } from './scan.service';
import { ScansApiController } from './scans-api.controller';

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
  controllers: [ScansApiController],
})
export class ScansApiModule {}
