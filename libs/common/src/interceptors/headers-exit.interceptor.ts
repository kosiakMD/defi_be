import { Request, Response as EResponse } from 'express';
import { Observable, tap } from 'rxjs';

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import {
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

export interface Response<T> extends EResponse<T, any> {
  data: T;
}

@Injectable()
export class HeadersExitInterceptor<T = any, R = any> implements NestInterceptor<T, R> {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  private static handleHeadersBeforeExit(context: ExecutionContext) {
    const hostType = context.getType();
    // TODO: implement all host types we use
    if (hostType === 'http') {
      // get time-end ASAP
      const timestampExit = Date.now();
      // handle Execute time
      const httpContext = context.switchToHttp();
      const request: Request = httpContext.getRequest<Request>();
      const timestampEntry = request.header(HEADER_TIMESTAMP_ENTRY);
      const timeExecute = timestampExit - Number(timestampEntry);
      // set response timers headers
      const response: Response<any> = httpContext.getResponse<Response<any>>();
      response.header(HEADER_TIMESTAMP_EXIT, String(timestampExit));
      response.header(HEADER_TIME_EXECUTE, String(timeExecute));
    }
  }

  // mistake of TS rxjs 0: CallHandler wants T but should be R only
  intercept(context: ExecutionContext, next: CallHandler<T | R>): Observable<R> {
    return next.handle().pipe(
      tap(
        () => {
          console.log('__tap exit success');
          HeadersExitInterceptor.handleHeadersBeforeExit(context);
        },
        () => {
          console.log('__tap exit error');
          HeadersExitInterceptor.handleHeadersBeforeExit(context);
        },
      ),
    ) as Observable<R>;
  }
}
