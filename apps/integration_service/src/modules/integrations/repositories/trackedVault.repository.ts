import { SearchParams } from 'apps/api_gateway/src/search/search.interface';
import { EntityRepository, Repository } from 'typeorm';
import { TrackedVaultEntity } from '../entities/trackedVault.entity';
import { VaultForSearchResponse } from '../interfaces/VaultForSearchResponse.interface';

@EntityRepository(TrackedVaultEntity)
export class TrackedVaultRepository extends Repository<TrackedVaultEntity> {
  async findVaultsByParams(
    searchParams: SearchParams
  ): Promise<VaultForSearchResponse[]> {
    const { text } = searchParams;
    const params = [];
    params.push(`%${text}%`);
    const lambdaAssetsSql = `
      SELECT
        tv.id,
        tv.feature,
        tv.protocol,
        tv.chain_id as "chainId"
      FROM tracked_vault AS tv
      WHERE LOWER(tv.protocol) LIKE LOWER($1)
      ORDER BY tv.protocol, tv.feature
      LIMIT 30
    `;

    return this.query(lambdaAssetsSql, params);
  }
}
