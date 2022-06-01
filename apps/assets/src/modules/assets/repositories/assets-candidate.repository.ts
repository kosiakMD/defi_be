import { EntityRepository, ILike, Repository } from 'typeorm';

import { AssetCandidateEntity } from '../entities/asset-candidate.entity';

@EntityRepository(AssetCandidateEntity)
export class AssetsCandidateRepository extends Repository<AssetCandidateEntity> {
  getBy(chainId: number, address: string) {
    return this.findOne({ where: { chainId, address: ILike(address) } });
  }
}
