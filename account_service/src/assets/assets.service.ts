import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { classToPlain } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsEntity } from './assets.entity';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsEntity) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  async queryAllAssets(): Promise<AssetsEntity[]> {
    try {
      // db query works very fast
      const storedAssets: AssetsEntity[] = await this.assetRepository.find({
        where: { isReadyToMigrate: true },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return classToPlain(storedAssets);
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }
}
