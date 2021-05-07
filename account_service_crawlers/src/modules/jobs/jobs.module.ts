import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// import { BscTransferPriceService } from './bscTransferPrice.service';
// import { EthTokenPriceService } from './ethTokenPrice.service';
import { BscTransferUpdateService } from './transfers/bsc/bscTransfersUpdate.service';
import { EthTransferUpdateService } from './transfers/eth/ethTransfersUpdate.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  providers: [BscTransferUpdateService, EthTransferUpdateService],
  exports: [BscTransferUpdateService, EthTransferUpdateService],
})
export class JobsModule {}
