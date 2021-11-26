import { unifyAddress } from '@app/common/utils/addresses';

export function splitToArrayAndUnify(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(',').map(unifyAddress);
}

export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(',');
}

export function splitToNumberArray(value: string): number[] {
  return splitToArray(value).map((item) => Number(item));
}
