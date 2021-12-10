import { unifyAddress } from '@app/common/utils/addresses';

export function splitToArrayAndUnify(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(',').map(unifyAddress);
}
