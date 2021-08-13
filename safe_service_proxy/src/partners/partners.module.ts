import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [HttpModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
