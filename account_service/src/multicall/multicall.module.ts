import { Module } from '@nestjs/common';

import { MulticallSevice } from './multicall.sevice';

@Module({
  providers: [MulticallSevice],
  exports: [MulticallSevice],
})
export class MulticallModule {}
