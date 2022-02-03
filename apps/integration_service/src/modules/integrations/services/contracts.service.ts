import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AbisEntity } from '../entities/abis.entity';
import { ContractsEntity } from '../entities/contracts.entity';
import { FeaturesEntity } from '../entities/features.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractsEntity)
    public repository: Repository<ContractsEntity>,
  ) {}

  async findByAddressAndChainId(address: string, chainId: number) {
    return this.repository.findOne({
      where: {
        address: address,
        chainId: chainId,
      },
      relations: ['abi', 'feature', 'vaults'],
    });
  }

  async findOrSave(address: string, chainId: number) {
    const existedEntry = await this.findByAddressAndChainId(address, chainId);
    if (existedEntry) return existedEntry;

    const contractEntity = new ContractsEntity();
    contractEntity.address = address;
    contractEntity.chainId = chainId;
    return this.repository.save<ContractsEntity>(contractEntity);
  }

  async addAbiRelation(contractEntity: ContractsEntity, abiEntity: AbisEntity) {
    contractEntity.abi = abiEntity;
    await this.repository.save<ContractsEntity>(contractEntity);
    return this.findByAddressAndChainId(contractEntity.address, contractEntity.chainId);
  }

  async addFeatureRelation(contractEntity: ContractsEntity, featureEntity: FeaturesEntity) {
    contractEntity.feature = featureEntity;
    await this.repository.save<ContractsEntity>(contractEntity);
    return this.findByAddressAndChainId(contractEntity.address, contractEntity.chainId);
  }
}
