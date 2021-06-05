import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    StoreModule,
  ],
  controllers: [
    MigrationController,
  ],
  providers: [
    MigrationService,
  ],
  exports: [
    MigrationService,
  ],
})
export class MigrationModule {

}
