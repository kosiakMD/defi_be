import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Web3Provider } from './web3.provider';

@Module({
  imports: [ConfigService],
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class ChainModule {}
