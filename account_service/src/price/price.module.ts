import { HttpModule, Module } from '@nestjs/common';

import { LoggerModule } from '../Logger/LoggerModule';
import { PriceService } from './price.service';

@Module({
  imports: [HttpModule, LoggerModule],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
