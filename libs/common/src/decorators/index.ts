// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createParamDecorator, HttpException, HttpStatus } from '@nestjs/common';

import { ChainIdEnum } from '@app/common/enum';
import { Address } from '@app/common/types';
import { filterByEnum, splitToArray, splitToNumberArray } from '@app/common/utils';
import { unifyAddress, unifyAddresses } from '@app/common/utils/addresses';

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
  } catch (e) {
    throw new HttpException(e, 500);
  }
  return output;
});

export const Addresses = createParamDecorator((dataField, req) => {
  const input = req.args[0].query[dataField];
  let output: Address[];
  try {
    output = Array.from(new Set(input.split(',').map((a) => a.toLowerCase())));
  } catch (e) {
    throw new HttpException(e, 500);
  }
  return output;
});
