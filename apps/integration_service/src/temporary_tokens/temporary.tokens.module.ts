import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from '../logger/logger.module';
import { CoingeckoService } from './coingecko.service';
import { TemporaryTokensEntity } from './entities/temporary.tokens.entity';
import { TemporaryTokensController } from './temporary.tokens.controller';
import { TemporaryTokensService } from './temporary.tokens.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemporaryTokensEntity]), HttpModule, LoggerModule],
  providers: [CoingeckoService, TemporaryTokensService],
  controllers: [TemporaryTokensController],
})
export class TemporaryTokensModule {}
