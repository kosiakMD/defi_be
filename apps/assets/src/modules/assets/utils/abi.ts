import { AbiItem } from 'web3-utils';

export function findAbiItem(abiItems: AbiItem[], name: string): AbiItem {
  return abiItems.find((item) => item.name === name);
}