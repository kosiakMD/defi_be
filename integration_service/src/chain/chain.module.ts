import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3Provider } from './web3.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class ChainModule {}
