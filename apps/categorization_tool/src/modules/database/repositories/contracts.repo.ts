import { EntityRepository, IsNull, Not, Repository } from 'typeorm';

import { Contract } from '../entities/contract.entity';

@EntityRepository(Contract)
export class ContractsRepository extends Repository<Contract> {
  async findWithoutAbiOrAbiCode() {
    return this.find({
      where: [{ abi: null }, { abiCode: null }],
    });
  }

  async findAllWithAbi() {
    return this.find({
      where: { abi: Not(IsNull()) },
    });
  }
}
