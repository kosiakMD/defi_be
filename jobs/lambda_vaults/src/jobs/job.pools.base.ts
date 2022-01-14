import { plainToClass } from 'class-transformer';

import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';

import { SettingsService } from '../store/service/settings.service';
import { Setting } from '../store/setting.entity';
import { JobBase } from './job.base';

export abstract class JobPoolsBase<T extends NotifySupportedFeature> extends JobBase<T> {
  protected abstract readonly settingsService: SettingsService;

  protected async findOrCreateSetting(settingId: string): Promise<Setting> {
    const foundSetting = await this.settingsService.findByName(settingId);
    if (foundSetting) return foundSetting;

    const newSetting = plainToClass(Setting, {
      name: settingId,
    });

    return this.settingsService.create(newSetting);
  }
}
