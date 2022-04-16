import { unifyAddress } from '@app/common/utils';

export function splitToArrayAndUnify(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(',').map(unifyAddress);
}