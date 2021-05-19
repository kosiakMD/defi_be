import { Module } from '@nestjs/common';

import { MultiCallBsc } from './multicall/multicallbsc';
import { MulticallEth } from './multicall/multicalleth';
import { Web3Provider } from './web3.provider';

@Module({
  providers: [Web3Provider, MulticallEth, MultiCallBsc],
  exports: [Web3Provider, MulticallEth, MultiCallBsc],
})
export class ChainModule {}
