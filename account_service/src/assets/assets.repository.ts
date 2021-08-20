import { EntityRepository, In, Repository } from 'typeorm';

import { ChainIdEnum } from '../common/enum';
import { Address, Chains } from '../common/interfaces';

import { AssetsEntity } from './entity/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  async findAllByAddressesAndChains(addresses: Address[], chains: Chains): Promise<AssetsEntity[]> {
    return await this.find({
      where: { address: In(addresses), chain: In(chains) },
    });
  }

  async findAll(): Promise<AssetsEntity[]> {
    return await this.find({
      where: { isReadyToMigrate: true },
    });
  }

  async findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetsEntity> {
    return this.findOne({
      where: { address: address, chain: chainId },
    });
  }
}
