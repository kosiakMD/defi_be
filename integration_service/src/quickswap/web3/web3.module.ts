import { Module } from '@nestjs/common';
import { Web3Provider } from 'src/chain/web3.provider';


@Module({
  imports: [],
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class Web3Module {}
