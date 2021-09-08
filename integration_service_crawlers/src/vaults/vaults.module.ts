import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApisModule } from '../apis/apis.module';
import { JobsModule } from '../jobs/jobs.module';
import { TheGraphModule } from '../thegraph/theGraphModule';
import { VaultsServiceSushiswap } from './sushiswap/vaults.service.sushiswap';
import { VaultsService } from './vaults.service';
import { Web3Provider } from './web3.provider';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule.forRoot(),
    TheGraphModule,
    ApisModule,
    forwardRef(() => JobsModule),
  ],
  providers: [VaultsServiceSushiswap, Web3Provider, VaultsService],
  exports: [VaultsService],
})
export class VaultsModule {}
