import { EntityRepository, ILike, Repository } from 'typeorm';
import { FindConditions } from 'typeorm/find-options/FindConditions';

import { ChainIdEnum } from '@app/common/enum';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { AssetEntity } from '../entities/asset.entity';

export type AssetReference = {
  chainId: number;
  address: string;
};

@EntityRepository(AssetEntity)
export class AssetsRepository extends Repository<AssetEntity> {
  findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetEntity> {
    return this.findOne({
      where: { chainId, address: ILike(address) },
    });
  }

  findManyByAddressesAndChainIds(
    requests: AssetReference[],
    include?: string[],
  ): Promise<AssetEntity[]> {
    return this.find({
      where: requests.map(({ chainId, address }) => ({
        chainId,
        address: ILike(address),
      })),
      relations: include,
    });
  }

  async getAllTrackedAssetChains(): Promise<number[]> {
    const chains = await this.createQueryBuilder('assets')
      .select('assets.chain_id as "chainId"')
      .where('assets.is_tracked = true and assets.disabled = false')
      .distinct(true)
      .getRawMany();
    return chains.map(({ chainId }) => chainId);
  }

  async findAssetsByParams({ address, text, limit }: SearchParams): Promise<AssetEntity[]> {
    const commonConditions: FindConditions<AssetEntity> = { isTracked: true, disabled: false };
    const conditions: FindConditions<AssetEntity>[] = [];
    if (address) {
      conditions.push({ ...commonConditions, address: ILike(address) });
    }
    if (text) {
      conditions.push({ ...commonConditions, name: ILike(`%${text}%`) });
      conditions.push({ ...commonConditions, symbol: ILike(`%${text}%`) });
    }

    return this.find({
      where: conditions,
      order: {
        rank: 'ASC',
        name: 'ASC',
        symbol: 'ASC',
      },
      take: limit || 30,
    });
  }
}
