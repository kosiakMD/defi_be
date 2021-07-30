import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// import { LoggerModule } from '../common/Logger/LoggerModule';
import { ImpermanentLossController } from './impermanent-loss.controller';
import { ImpermanentLossService } from './impermanent-loss.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // LoggerModule,
  ],
  providers: [ImpermanentLossService],
  controllers: [ImpermanentLossController],
})
export class ImpermanentLossModule {}
