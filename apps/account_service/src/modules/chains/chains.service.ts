import { In, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ChainId } from '@app/common';
import { CrudService } from '@app/common/services/crud.service';

import { ChainsEntity } from './entities/chain.entity';

@Injectable()
export class ChainsService extends CrudService<ChainsEntity> {
  constructor(
    @InjectRepository(ChainsEntity) private readonly chainRepository: Repository<ChainsEntity>,
  ) {
    super(chainRepository);
  }

  public async getChainIdByName(name: string) {
    const chain = await this.get({ name });
    return chain.id;
  }

  public async getManyChainIdsByNames(names: string[]) {
    const chains = await this.getAll({
      where: {
        name: In(names),
      },
    });

    return chains.map((c) => c.id);
  }

  public async getChainNameById(id) {
    const chain = await this.get({ id });
    return chain.name;
  }

  public async getChainAbbrByNameOrAbbr(name: string) {
    let chain = await this.get({ name });
    if (chain) return chain;
    chain = await this.get({ abbr: name });
    return chain.abbr;
  }

  public async getInternalChainIdByAbsId(chainId) {
    const chains = await this.getAll();
    const chain = chains.find((c) => c.metadata.absoluteChainId === chainId);
    return chain.id;
  }

  // 3rd party platforms

  public async getCoingeckoPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.coingeckoPlatformId;
  }

  public async debankPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.debankPlatformId;
  }

  public async getAbsoluteChainId(chainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.absoluteChainId;
  }
}
