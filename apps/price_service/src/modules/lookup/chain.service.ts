import { plainToClass } from 'class-transformer';

import { ChainDto } from '@app/common';
import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';
import { InternalChainIdByAbbr } from '@app/common/utils/chains';

export class ChainService {
  cacheTTLInSeconds: number;

  constructor() {
    // TODO: commented older version to get from DB
    // @InjectRepository(ChainEntity) private readonly repository: Repository<ChainEntity>, // @Inject(CACHE_MANAGER) private readonly cache: Cache, // private readonly config: ConfigService,
    // this.cacheTTLInSeconds = config.get<number>('CHAIN_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
  }

  getAll(): ChainDto[] {
    return Object.values(InternalChainIdByAbbr).map(this.getById);
  }
  // TODO: commented older version to get from DB
  // getAll(): Promise<ChainEntity[]> {
  //   return this.repository.find();
  // }
  // TODO: commented older version to get from DB
  // async getById(id: number): Promise<ChainEntity> {
  //   const cacheKey = `chain_${id}`;
  //   const cacheValue = await this.cache.get<ChainDto>(cacheKey);
  //   if (cacheValue) {
  //     return cacheValue;
  //   }
  //   const chain = await this.repository.findOne({ where: { id } });
  //   await this.cache.set(cacheKey, chain, { ttl: this.cacheTTLInSeconds });
  //   return chain;
  // }

  getById(id: number): ChainDto {
    const chain = plainToClass(ChainDto, {});

    const prefix = ChainIdEnum[id];

    chain.id = id;
    chain.name = ChainNameEnum[prefix];
    chain.abbr = ChainAbbrEnum[prefix];

    return chain;
  }
}
