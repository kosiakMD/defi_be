import { EntityRepository, ILike, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { AssetCandidateEntity } from '../entities/asset-candidate.entity';

@Injectable()
@EntityRepository(AssetCandidateEntity)
export class AssetsCandidateRepository extends Repository<AssetCandidateEntity> {
  getBy(chainId: number, address: string) {
    return this.findOne({ where: { chainId, address: ILike(address) } });
  }
}
