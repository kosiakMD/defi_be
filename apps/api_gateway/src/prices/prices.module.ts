import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// import { LoggerModule } from  '@app/common/Logger/LoggerModule';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // LoggerModule,
  ],
  providers: [PricesService],
  controllers: [PricesController],
})
export class PricesModule {}
