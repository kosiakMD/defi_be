import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { ChainIdEnum } from '@app/common/enum';

import { AssetMetadata } from '../../../../common/types/asset-metadata.type';

import { CardanoMetadataStrategy } from './strategies/cardano.strategy';
import { CosmosMetadataStrategy } from './strategies/cosmos.strategy';
import { EVMMetaDataStrategy } from './strategies/evm.strategy';
import { MetadataStrategy } from './strategies/metadata.strategy';
import { SolanaMetadataStrategy } from './strategies/solana.strategy';
import { TerraMetadataStrategy } from './strategies/terra.strategy';

@Injectable()
export class MetadataService {
  constructor(private readonly moduleRef: ModuleRef) {}

  public getMetadata(address: string, chainId: number): Promise<AssetMetadata> {
    const strategy = this.getMetadataStrategy(chainId);
    return strategy.getMetadata(address, chainId);
  }

  private getMetadataStrategy(chainId: number): MetadataStrategy {
    switch (chainId) {
      case ChainIdEnum.sol:
        return this.moduleRef.get(SolanaMetadataStrategy);
      case ChainIdEnum.terra:
        return this.moduleRef.get(TerraMetadataStrategy);
      case ChainIdEnum.cardano:
        return this.moduleRef.get(CardanoMetadataStrategy);
      case ChainIdEnum.cosmos:
      case ChainIdEnum.kava:
      case ChainIdEnum.osmosis:
      case ChainIdEnum.secret:
        return this.moduleRef.get(CosmosMetadataStrategy);
      default:
        return this.moduleRef.get(EVMMetaDataStrategy);
    }
  }
}
