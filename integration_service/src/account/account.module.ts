import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
