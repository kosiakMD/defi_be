import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Setting } from '../setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  async findByName(name: string): Promise<Setting> {
    return this.settingsRepository.findOne({
      where: { name: name },
    });
  }

  async create(setting: Setting): Promise<Setting> {
    const created = await this.settingsRepository.save(setting);
    return await this.settingsRepository.findOne(created.id);
  }

  async update(setting: Setting): Promise<Setting> {
    await this.settingsRepository.update(setting.id, setting);
    return await this.settingsRepository.findOne(setting.id);
  }
}
