import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeaturesEntity } from '../entities/features.entity';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeaturesEntity)
    private settingsRepository: Repository<FeaturesEntity>,
  ) {}

  async findOneByName(name: string): Promise<FeaturesEntity> {
    return this.settingsRepository.findOne({
      where: { name: name },
    });
  }
}
