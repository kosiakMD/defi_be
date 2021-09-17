import { createParamDecorator, HttpException } from '@nestjs/common';

import { ChainIdEnum } from '@app/common/enum';

export * from './error.decorators';

export const Chains = createParamDecorator((dataField, req) => {
  const input = req.args[0].query[dataField];
  let output: ChainIdEnum[];
  try {
    output = input.split(',').map(Number);
  } catch (e) {
    throw new HttpException(e, 500);
  }
  return output;
});
