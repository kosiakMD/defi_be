import { Module } from '@nestjs/common';
import { PancakesController } from './pancake.controller';
import { PancakesCachedService } from './pancake.cached.service';
import { PancakesService } from './pancake.service';

@Module({
	controllers: [PancakesController],
	providers: [PancakesCachedService, PancakesService],
})
export class PancakesModule {}
