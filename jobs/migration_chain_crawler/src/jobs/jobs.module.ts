import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MigrationModule } from '../migrations/migration.module';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule, MigrationModule],
})
export class JobsModule {}
