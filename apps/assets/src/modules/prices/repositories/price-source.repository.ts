import { EntityRepository, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { PriceSourceEntity } from '../entities/price-source.entity';
import { PriceSourceStrategy } from '../enums/price-source-strategy.enum';

@Injectable()
@EntityRepository(PriceSourceEntity)
export class PriceSourceRepository extends Repository<PriceSourceEntity> {
  getPriceSourcesByType(type: PriceSourceStrategy) {
    return this.find({
      where: {
        enabled: true,
        type,
      },
    });
  }
}
