import { createParamDecorator, HttpException } from '@nestjs/common';

import { ChainIdEnum } from '../enum';

export * from './error.decorators';

export const ChainsSplit = createParamDecorator((dataField, req) => {
  const input = req.args[0].query[dataField];
  let output: ChainIdEnum[];
  try {
    output = input.split(',').map(Number);
  } catch (e) {
    throw new HttpException(e, 500);
  }
  return output;
});
