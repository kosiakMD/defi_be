import { Module } from '@nestjs/common';

import { PancakesCachedService } from './pancake.cached.service';
import { PancakesController } from './pancake.controller';
import { PancakesService } from './pancake.service';

@Module({
	controllers: [PancakesController],
	providers: [PancakesCachedService, PancakesService],
})
export class PancakesModule {}
