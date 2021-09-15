// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AxiosError } from 'axios';

import { HttpException } from '@nestjs/common';

import { Logger } from '../../logger/logger.service';

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
          let errorMessage = 'Error';
          errorMessage += ` method [${e.config.method.toUpperCase()}],`;
          errorMessage += ` status [${e.request?.res ? e.request?.res.statusCode : 'undefined'}],`;
          errorMessage += ` url [${e.config.url}],`;
          errorMessage += ` request data: [${e.config.data ? `${e.config.data}` : ''}]`;
          logger.error(errorMessage, stack, context);
          if (e.request?.res) {
            throw new HttpException(e.request.res.statusMessage, e.request.res.statusCode);
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
