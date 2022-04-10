import { createParamDecorator, HttpException, HttpStatus } from '@nestjs/common';

import { Address } from '../types';
import { ChainIdEnum } from '../enum';
import { filterByEnum, splitToArray, splitToNumberArray, unifyAddress, unifyAddresses } from '../utils';

export * from './error.decorators';

export const ChainsArray = createParamDecorator((dataField, req): number[] => {
  const input: string | Array<number | string> = req.args[0].query[dataField];

  if (!input) {
    throw new HttpException('Chains are not provided', HttpStatus.BAD_REQUEST);
  }

  const output: number[] = filterByEnum(
    Array.isArray(input) ? input.map(Number) : splitToNumberArray(input),
    ChainIdEnum,
  );

  if (!output.length) {
    throw new HttpException('Provided unsupported chains', HttpStatus.BAD_REQUEST);
  }

  return output.map(Number);
});

export const AddressesArray = createParamDecorator((dataField, req): Address[] => {
  const input: string | Address[] = req.args[0].query[dataField];

  if (!input) {
    throw new HttpException('User address is not provided', HttpStatus.BAD_REQUEST);
  }

  return Array.isArray(input) ? unifyAddresses(input) : splitToArray(input).map(unifyAddress);
});

export const ChainsParam = createParamDecorator((dataField, req) => {
  const input = req.args[0].query[dataField];
  let output: ChainIdEnum[];
  try {
    output = input.split(',').map(Number);
  } catch (e: any) {
    throw new HttpException(e, 500);
  }
  return output;
});

export const Addresses = createParamDecorator((dataField, req) => {
  const input = req.args[0].query[dataField];
  let output: Address[];
  try {
    output = Array.from(new Set(input.split(',').map((a) => a.toLowerCase())));
  } catch (e: any) {
    throw new HttpException(e, 500);
  }
  return output;
});
