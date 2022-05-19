import { EntityRepository, ILike, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';

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

  async findAllWithAbiAndAbiCode(skip = 0, take = 100): Promise<Contract[]> {
    return this.find({
      where: { id: MoreThan(0), abi: Not(IsNull()), abiCode: Not(IsNull()) },
      relations: ['protocol'],
      skip,
      take,
    });
  }

  async findTemplates(): Promise<Contract[]> {
    return this.find({
      where: { id: LessThan(0) },
    });
  }

  async findByAddress(address: string) {
    return this.findOne({ address });
  }

  async findByAddressCaseInsensitive(address: string) {
    return this.findOne({
      where: { address: ILike(address) },
    });
  }
}
