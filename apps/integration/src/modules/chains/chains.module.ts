import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MulticallProvider } from './multicall/multicall.provider';
import { Web3Provider } from './web3.provider';

@Module({
  imports: [TypeOrmModule.forFeature(), HttpModule],
  providers: [Web3Provider, MulticallProvider],
  exports: [Web3Provider, MulticallProvider],
})
export class ChainsModule {}
