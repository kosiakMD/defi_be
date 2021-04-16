import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApisModule } from '../apis/apis.module';
import { JobsModule } from '../jobs/jobs.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { GaugeRewards } from './curve/gauge.rewards';
import { VaultsServiceCurve } from './curve/vaults.service.curve';
import { VaultsServiceSushiswap } from './sushiswap/vaults.service.curve';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';
import { Web3Provider } from './web3.provider';

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
    forwardRef(() => JobsModule),
  ],
  providers: [
    VaultsServiceCurve,
    VaultsServiceSushiswap,
    GaugeRewards,
    Web3Provider,
    VaultsService,
  ],
  exports: [VaultsService],
})
export class VaultsModule {}
