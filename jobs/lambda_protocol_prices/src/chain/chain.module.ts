import { Module } from '@nestjs/common';

import { MulticallService } from './multicall.service';
import { Web3Provider } from './web3.provider';

@Module({
  providers: [Web3Provider, MulticallService],
  exports: [Web3Provider, MulticallService],
})
export class ChainModule {}
