import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SettingsEntity } from '../entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private settingsRepository: Repository<SettingsEntity>,
  ) {}

  async findOneByName(name: string): Promise<SettingsEntity> {
    return this.settingsRepository.findOne({
      where: { name: name },
    });
  }
}
