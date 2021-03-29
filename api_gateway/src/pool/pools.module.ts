import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PoolsController } from './pools.controller';
import { PoolsService } from './pools.service';

@Module({
	imports: [
		HttpModule.register({
			timeout: 5000,
			maxRedirects: 2,
		}),
		CacheModule.register(),
		ConfigModule,
	],
	providers: [PoolsService],
	controllers: [PoolsController],
})
export class PoolsModule {}
