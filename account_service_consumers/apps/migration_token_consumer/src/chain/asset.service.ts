import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger/logger.service';
import { AssetsEntity } from '../store/entities/assets.entity';
import { MinEthContract } from './contracts/minimalContract';

@Injectable()
export class AssetService {
  constructor(
    protected readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    protected readonly minEthContract: MinEthContract,
  ) {}

  async getTokenInfo(address: string): Promise<Partial<AssetsEntity>> {
    return this.minEthContract.getContractData(address);
  }
}
