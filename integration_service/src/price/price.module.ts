import { HttpModule, Module } from '@nestjs/common';

import { PriceService } from './price.service';

@Module({
  imports: [HttpModule],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
