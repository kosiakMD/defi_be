import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';

@Module({
	imports: [
		HttpModule.register({
			timeout: 5e3,
			maxRedirects: 2,
		}),
		CacheModule.register(),
		ConfigModule,
	],
	providers: [VaultsService],
	controllers: [VaultsController],
})
export class VaultsModule {}
