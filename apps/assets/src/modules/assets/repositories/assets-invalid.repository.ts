import { EntityRepository, ILike, Repository } from 'typeorm';

import { Address, ChainId } from '@app/common';

import { AssetInvalidEntity } from '../entities/asset-invalid.entity';

@EntityRepository(AssetInvalidEntity)
export class AssetsInvalidRepository extends Repository<AssetInvalidEntity> {
  getByChainAndAddress(chainId: ChainId, address: Address) {
    return this.findOne({ where: { chainId, address: ILike(address) } });
  }

  async removeByChainIdAndAddress(chainId: ChainId, address: Address) {
    const entity = await this.getByChainAndAddress(chainId, address);
    if (entity) {
      await this.remove(entity);
    }
  }
}
