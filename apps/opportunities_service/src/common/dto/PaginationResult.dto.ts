import { BaseEntity } from '@app/common/entities/Base.entity';

export class PaginationResult<T extends BaseEntity> {
  // All results
  items: T[];
  // Total number of items returned in this query
  count: number;
  // max number of items returned this query
  limit: number;
  // Current page
  page: number;
  // total number of available pages
  pages: number;
  // Total number of available results
  total: number;
}
