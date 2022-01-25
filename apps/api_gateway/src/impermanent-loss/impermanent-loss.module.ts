import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// import { LoggerModule } from  '@app/common/Logger/LoggerModule';
import { ImpermanentLossController } from './impermanent-loss.controller';
import { ImpermanentLossService } from './impermanent-loss.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ImpermanentLossService],
  controllers: [ImpermanentLossController],
})
export class ImpermanentLossModule {}
