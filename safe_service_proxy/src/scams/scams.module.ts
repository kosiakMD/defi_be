import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ScamsController } from './scams.controller';
import { ScamsService } from './scams.service';

@Module({
  imports: [HttpModule],
  controllers: [ScamsController],
  providers: [ScamsService],
})
export class ScamsModule {}
