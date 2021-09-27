import { Module } from '@nestjs/common';

import { MultiCallService } from './multicall.service';

@Module({
  imports: [],
  providers: [MultiCallService],
  exports: [MultiCallService],
})
export class MultiCallModule {}
