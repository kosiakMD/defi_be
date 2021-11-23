import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AssetsEntity } from './entities/assets.entity';
import { AssetsRepository } from './repositories/assets.repository';

@Injectable()
export class AssetsStore {
  constructor(@InjectRepository(AssetsEntity) private readonly repository: AssetsRepository) {}

  async save(asset: AssetsEntity) {
    await this.repository.save(asset);
    return await this.findByAddressAndChainId(asset.address, asset.chainId);
  }

  async findOne(assetId: number): Promise<AssetsEntity> {
    return await this.repository.findOne(assetId);
  }

  async findByAddressAndChainId(address: string, chainId: number): Promise<AssetsEntity> {
    return await this.repository.findOne({ where: { address: address, chainId: chainId } });
  }
}
