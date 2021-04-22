import { HttpModule, Module } from '@nestjs/common';

import { PriceService } from './price.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
    }),
  ],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
