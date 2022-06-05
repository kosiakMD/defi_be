import { Address } from '@app/common';

export interface SearchParams {
  addresses?: Address[];
  text?: string;
  limit?: number;
}
