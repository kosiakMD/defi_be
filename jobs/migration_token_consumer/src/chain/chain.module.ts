import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetService } from './asset.service';
import { MinEthContract } from './contracts/minimalContract';
import { Web3Provider } from './web3.provider';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature()],
  providers: [Web3Provider, MinEthContract, AssetService],
  exports: [Web3Provider, MinEthContract, AssetService],
})
export class ChainModule {}
