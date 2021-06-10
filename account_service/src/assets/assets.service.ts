import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { classToPlain } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsDto } from './assets.dto';
import { AssetsEntity } from './assets.entity';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetsEntity) private readonly assetRepository: AssetsRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  async queryAllAssets(): Promise<AssetsDto[]> {
    try {
      const storedAssets = await this.assetRepository.find();
      // TODO: fix TS problems - it works, but type not!
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return classToPlain(storedAssets.map((a) => new AssetsDto(a)));
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }
}
