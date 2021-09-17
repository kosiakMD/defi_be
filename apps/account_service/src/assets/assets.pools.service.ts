import { getManager } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { getCurrentDate } from '../utils/time';
import { AssetsPoolsDto } from './dto/assets.pools.dto';

@Injectable()
export class AssetsPoolsService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async saveAssetsPoolsToDb(assetsPools: AssetsPoolsDto[]): Promise<void> {
    const sql = this.getSqlStringForAssetsPools(assetsPools);
    await getManager().query(sql);
  }

  private getSqlStringForAssetsPools(assetsPools: AssetsPoolsDto[]): string {
    const values = assetsPools.map((assetPools) => {
      return `(${assetPools.id}, '${JSON.stringify(assetPools.pairs)}', '${getCurrentDate()}')`;
    });

    return AssetsPoolsService.getInsert(values);
  }

  private static getInsert(values: string[]): string {
    if (!values.length) {
      return '';
    }
    return `insert into assets_pools(asset_id, pairs, created_at) values ${values.join(',')}
            on conflict(asset_id) 
            do update set 
            pairs = EXCLUDED.pairs, 
            created_at = EXCLUDED.created_at`;
  }
}
