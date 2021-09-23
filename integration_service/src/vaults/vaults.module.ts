import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VaultsEntity } from './entities/vaults.entity';
import { VaultsRepository } from './repository/vaults.repository';
import { VaultsService } from './vaults.service';

@Module({
  imports: [TypeOrmModule.forFeature([VaultsEntity])],
  providers: [VaultsService, VaultsRepository],
})
export class VaultsModule {}
