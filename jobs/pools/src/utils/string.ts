import { ChainIdEnum } from '../config/enum';

export function getJobPlaceholder(chain: ChainIdEnum, feature: string, project: string): string {
  return chain + '_' + project + '_' + feature;
}
