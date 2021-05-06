import { HttpModule, Module } from '@nestjs/common';

import { EtherscanApi } from './etherscan.api';
import { EtherscanService } from './etherscan.service';

@Module({
  imports: [HttpModule],
  providers: [EtherscanApi, EtherscanService],
  exports: [EtherscanApi, EtherscanService],
})
export class EtherscanModule {}
