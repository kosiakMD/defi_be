// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AxiosError } from 'axios';

import { HttpException } from '@nestjs/common';

import { Logger } from '../logger/logger.service';

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
