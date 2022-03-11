import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AbisEntity } from '../entities/abis.entity';
import { ContractsEntity } from '../entities/contracts.entity';
import { ProjectsEntity } from '../entities/projects.entity';

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
      relations: ['abi', 'project', 'vaults'],
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

  async addProjectRelation(contractEntity: ContractsEntity, projectEntity: ProjectsEntity) {
    contractEntity.project = projectEntity;
    await this.repository.save<ContractsEntity>(contractEntity);
    return this.findByAddressAndChainId(contractEntity.address, contractEntity.chainId);
  }
}
