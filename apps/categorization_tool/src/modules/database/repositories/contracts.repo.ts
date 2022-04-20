import { EntityRepository, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';

import { Contract } from '../entities/contract.entity';

/**
 * contracts with id < 0 are templates
 */
@EntityRepository(Contract)
export class ContractsRepository extends Repository<Contract> {
  async findWithoutAbiOrAbiCode(): Promise<Contract[]> {
    return this.find({
      where: [
        { id: MoreThan(0), abi: null },
        { id: MoreThan(0), abiCode: null },
      ],
    });
  }

  async findAllWithAbiAndAbiCode(): Promise<Contract[]> {
    return this.find({
      where: { id: MoreThan(0), abi: Not(IsNull()), abiCode: Not(IsNull()) },
    });
  }

  async findTemplates(): Promise<Contract[]> {
    return this.find({
      where: { id: LessThan(0) },
    });
  }
}
