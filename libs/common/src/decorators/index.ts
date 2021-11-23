// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AxiosError } from 'axios';

import { HttpStatus } from '@nestjs/common';
import { createParamDecorator, HttpException } from '@nestjs/common';

import { Address, Logger } from '..';
import { ChainIdEnum } from '../enum';
import { filterByEnum } from '../utils';
import { splitToArray } from '../utils/string';
import { splitToNumberArray } from '../utils/transform';

export const ChainsSplit = createParamDecorator((dataField, req): number[] => {
  try {
    const input: string = req.args[0].query[dataField];
    return splitToNumberArray(input);
  } catch (e) {
    throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

export const ChainsArray = createParamDecorator((dataField, req): number[] => {
  try {
    const input: string | Array<number | string> = req.args[0].query[dataField];

    if (!input) {
      throw 'Chains are not provided';
    }

    const output: number[] = filterByEnum(
      Array.isArray(input) ? input.map(Number) : splitToNumberArray(input),
      ChainIdEnum,
    );

    if (!output.length) {
      throw 'Provided unsupported chains';
    }

    return output.map(Number);
  } catch (e) {
    throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

export const AddressesSplit = createParamDecorator((dataField, req): Address[] => {
  try {
    const input: string = req.args[0].query[dataField];
    return splitToArray(input);
  } catch (e) {
    throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

export const AddressesArray = createParamDecorator((dataField, req): Address[] => {
  try {
    const input: string | Address[] = req.args[0].query[dataField];

    if (!input) {
      throw 'User address is not provided';
    }

    return Array.isArray(input) ? input.map((_) => _.toLocaleLowerCase()) : splitToArray(input);
  } catch (e) {
    throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});

export const RequestErrorHandler = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): any {
    const method = descriptor.value;

    descriptor.value = async function (...args: any): Promise<any> {
      const logger: Logger = this.logger;
      try {
        return await method.apply(this, args);
      } catch (e: any | Error | AxiosError) {
        const context = `${this.constructor.name}.${propertyKey}`;
        if (e.isAxiosError) {
          const stack = e.toJSON().stack;
          logger.error(
            `Error ${e.request.method} ${e.request.res.responseUrl}${
              e.request.data ? `\n${e.request.data}` : ''
            }`,
            stack,
            context,
          );
          if (e.request?.res) {
            const error = new HttpException(e.request.res.statusMessage, e.request.res.statusCode);
            logger.error(error, stack, context);
            throw error;
          }
        } else {
          logger.error(e, e.stack, context);
          if (e.code) {
            const error = new HttpException(e.message, e.code);
            logger.error(error, e.stack, context);
            throw error;
          }
        }
        throw e;
      }
    };
  };
};
