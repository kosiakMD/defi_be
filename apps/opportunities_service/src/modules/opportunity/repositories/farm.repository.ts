import { EntityRepository, In, Repository } from 'typeorm';

import { FarmCreateDto } from '@app/common/dto/opportunities/farm.create.dto';

import { FarmEntity } from '../entities/farm.entity';

@EntityRepository(FarmEntity)
export class FarmRepository extends Repository<FarmEntity> {
  async findAllByName(farmNames: string[]): Promise<FarmEntity[]> {
    return this.find({
      where: { name: In(farmNames) },
    });
  }

  async insertMany(farms: FarmCreateDto[]): Promise<FarmEntity[]> {
    const inserted = await this.insert(farms);
    return this.findByIds(inserted.identifiers.map((f) => f.id));
  }

  async deleteItem(id: number): Promise<void> {
    await this.delete(id);
  }
}
