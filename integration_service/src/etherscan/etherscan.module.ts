import { HttpModule, Module } from '@nestjs/common';

import { EtherscanApi } from './etherscan.api';
import { EtherscanService } from './etherscan.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  providers: [EtherscanApi, EtherscanService],
  exports: [EtherscanApi, EtherscanService],
})
export class EtherscanModule {}
