import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VaultsController } from './vaults.controller';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { VaultsServiceCurve } from './curve/vaults.service.curve';
import { GaugeRewards } from './curve/gauge.rewards';
import { Web3Provider } from './web3.provider';
import { ApisModule } from '../apis/apis.module';
import { VaultsServiceSushiswap } from './sushiswap/vaults.service.curve';
import { JobsModule } from '../jobs/jobs.module';
import { VaultsService } from './vaults.service';

@Module({
	controllers: [VaultsController],
	imports: [
		HttpModule.register({
			timeout: 60000,
			maxRedirects: 5,
		}),
		ConfigModule.forRoot(),
		ThegraphModule,
		ApisModule,
		forwardRef(() => JobsModule)
	],
	providers: [VaultsServiceCurve, VaultsServiceSushiswap, GaugeRewards, Web3Provider, VaultsService],
	exports: [
		VaultsService
	]
})
export class VaultsModule {}
