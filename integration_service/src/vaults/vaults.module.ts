import { Module } from '@nestjs/common';
import { VaultsService } from './vaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultsController } from './vaults.controller';
import { VaultsEntity } from './entities/vaults.entity';
import { VaultsRepository } from './repository/vaults.repository';

@Module({
  controllers: [VaultsController],
  imports: [
    TypeOrmModule.forFeature([
      VaultsEntity
    ])
  ],
  providers: [VaultsService, VaultsRepository],

})
export class VaultsModule {
}
