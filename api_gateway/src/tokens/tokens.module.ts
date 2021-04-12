import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5e3,
      maxRedirects: 2,
    }),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [TokensService],
  controllers: [TokensController],
})
export class TokensModule {}
