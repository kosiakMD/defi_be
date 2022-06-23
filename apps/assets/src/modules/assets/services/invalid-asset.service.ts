import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId, Logger } from '@app/common';

import { AssetInvalidEntity } from '../entities/asset-invalid.entity';
import { AssetsInvalidRepository } from '../repositories/assets-invalid.repository';

const MAX_INVALID_ASSET_RETRY = 5;

export class InvalidAssetService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(AssetsInvalidRepository)
    private readonly repository: AssetsInvalidRepository,
  ) {}

  async isAssetInvalid(chainId: ChainId, address: Address) {
    const invalidAsset = await this.repository.getByChainAndAddress(chainId, address);
    return invalidAsset?.retries >= MAX_INVALID_ASSET_RETRY;
  }

  async increaseInvalidRetries(chainId: ChainId, address: Address) {
    let invalidAsset = await this.repository.getByChainAndAddress(chainId, address);
    if (!invalidAsset) {
      invalidAsset = new AssetInvalidEntity();
      invalidAsset.chainId = chainId;
      invalidAsset.address = address;
      invalidAsset.retries = 0;
    }

    invalidAsset.retries += 1;
    await this.repository.save(invalidAsset);
  }

  async cleanInvalidAsset(chainId: ChainId, address: Address) {
    await this.repository.removeByChainIdAndAddress(chainId, address);
  }
}
