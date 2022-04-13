import BigNumber from 'bignumber.js';
import { AbiItem } from 'web3-utils';

export function decodeOutput(abi: AbiItem, outputResult) {
  // if there is one output, it doesn't have a name (check abi)
  if (abi.outputs.length === 1) {
    return toInternalDataType(abi.outputs[0].type, outputResult[0]);
  }

  const decoded = {};
  abi.outputs.forEach((o, idx) => {
    decoded[o.name] = toInternalDataType(o.type, outputResult[o.name]);
    decoded[idx] = toInternalDataType(o.type, outputResult[o.name]);
  });
  return decoded;
}

export function toInternalDataType(type: string, value: any) {
  if (Array.isArray(value) && type.includes('[')) {
    return value.map((v) => toInternalDataType(type.split('[')[0], v));
  }

  if (type.includes('int')) {
    return new BigNumber(value);
  }
  return value;
}
