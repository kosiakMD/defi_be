import { HttpModule, Module } from '@nestjs/common';
import { PoolsService } from './pools.service';
import { PoolsController } from './pools.controller';

@Module({
	imports: [
		HttpModule.register({
			timeout: 5000,
			maxRedirects: 2,
		}),
	],
	providers: [PoolsService],
	controllers: [PoolsController],
})
export class PoolsModule {}
