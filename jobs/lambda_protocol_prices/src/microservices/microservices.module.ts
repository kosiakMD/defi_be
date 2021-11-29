import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AccountService } from './account.service';
import { PriceService } from './price.service';

@Module({
  imports: [HttpModule],
  providers: [AccountService, PriceService],
  exports: [AccountService, PriceService],
})
export class MicroservicesModule {}
