import { EntityRepository, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { PriceSourceEntity } from '../entities/price-source.entity';

@Injectable()
@EntityRepository(PriceSourceEntity)
export class PriceSourceRepository extends Repository<PriceSourceEntity> {}
