import { HttpModule, Module } from '@nestjs/common';

import { Web3Provider } from './web3.provider';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class ChainModule {}
