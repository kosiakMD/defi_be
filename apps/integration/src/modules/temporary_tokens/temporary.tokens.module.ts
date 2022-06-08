import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { TemporaryTokensController } from '../../controllers/temporary.tokens.controller';
import { TemporaryTokensEntity } from './entities/temporary.tokens.entity';
import { CoingeckoService } from './services/coingecko.service';
import { TemporaryTokensService } from './services/temporary.tokens.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemporaryTokensEntity]), HttpModule],
  providers: [CoingeckoService, TemporaryTokensService],
  controllers: [TemporaryTokensController],
})
export class TemporaryTokensModule {}
