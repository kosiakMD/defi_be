import { SearchParams } from 'apps/api_gateway/src/search/search.interface';
import { EntityRepository, Repository } from 'typeorm';

import { ProjectsContractEntity } from '../entities/projectsContract.entity';
import { ProjectsContractForSearchResponse } from '../interfaces/ProjectsForSearchResponse.interface';

@EntityRepository(ProjectsContractEntity)
export class ProjectsContractRepository extends Repository<ProjectsContractEntity> {
  private readonly queryPrefix = `SELECT
      pc.address,
      pc.id,
      pc.description,
      pi.name,
      pi.icon_project as icon
    FROM projects_contract AS pc
    LEFT JOIN projects_info AS pi ON pc.project_id = pi.id 
    WHERE `;

  private readonly queryPostfix = ` ORDER BY pc.description, pi.name LIMIT 30`;

  async findProjectsByParams(
    searchParams: SearchParams,
  ): Promise<ProjectsContractForSearchResponse[]> {
    // eslint-disable-next-line prefer-const
    let { address, text } = searchParams;
    if (text) {
      text = `%${text}%`;
    }
    let lambdaAssetsSql = this.queryPrefix;
    const params = [];
    if (address && text) {
      lambdaAssetsSql += `(LOWER(pc.description) LIKE LOWER($2) OR name LIKE $2) AND LOWER(pc.address) = LOWER($1)`;
      params.push(address);
      params.push(text);
    } else if (address) {
      lambdaAssetsSql += 'LOWER(pc.address) = LOWER($1)';
      params.push(address);
    } else {
      lambdaAssetsSql += `LOWER(pc.description) LIKE LOWER($1) OR LOWER(pi.name) LIKE LOWER($1)`;
      params.push(text);
    }
    lambdaAssetsSql += this.queryPostfix;
    return this.query(lambdaAssetsSql, params);
  }
}
