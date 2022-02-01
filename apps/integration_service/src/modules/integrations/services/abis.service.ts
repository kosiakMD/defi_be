import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AbisEntity } from '../entities/abis.entity';

@Injectable()
export class AbisService {
  constructor(
    @InjectRepository(AbisEntity)
    private abisRepository: Repository<AbisEntity>,
  ) {}

  async findByHash(hash: string): Promise<AbisEntity> {
    return this.abisRepository.findOne({
      where: { hash: hash },
    });
  }

  async findOrSave(abi: AbiItem[]): Promise<any> {
    let abiHash = createHash('sha256')
      .update(JSON.stringify(abi), 'utf8')
      .digest('hex');
    const existedEntry = await this.findByHash(abiHash);
    if (existedEntry) return existedEntry;

    const abiEntity = new AbisEntity();
    abiEntity.hash = abiHash;
    abiEntity.abi = abi;
    await this.abisRepository.save(abiEntity);
    return abiEntity;
  }
}
