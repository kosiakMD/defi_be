import { AbiItem } from 'web3-utils';

export function findAbiItemByName(abiItems: AbiItem[], name: string): AbiItem {
  return abiItems.find((item) => item.name === name);
}
