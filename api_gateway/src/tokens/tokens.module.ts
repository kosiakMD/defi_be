import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';

@Module({
  imports: [ConfigModule, HttpModule, CacheModule.register()],
  providers: [TokensService],
  controllers: [TokensController],
})
export class TokensModule {}
