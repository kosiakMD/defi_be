import { HttpModule, Module } from '@nestjs/common';

import { CovalentService } from './covalent.service';

@Module({
  imports: [HttpModule],
  providers: [CovalentService],
  exports: [CovalentService],
})
export class CovalentModule {}
