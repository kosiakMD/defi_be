import { Module } from '@nestjs/common';

import { Web3Provider } from './web3.provider';

@Module({
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class ChainModule {}
