import { Request, Response as EResponse } from 'express';
import { Observable } from 'rxjs';

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import {
  HEADER_PROTOCOL,
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIMESTAMP_ENTRY,
} from '@app/common/constant';

export interface Response<T> extends EResponse<T, any> {
  data: T;
}

@Injectable()
export class HeadersEntryInterceptor<T = any, R = any> implements NestInterceptor<T, R> {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  // mistake of TS rxjs 0: CallHandler wants T but should be R only
  intercept(context: ExecutionContext, next: CallHandler<T | R>): Observable<R> {
    const hostType = context.getType();
    // TODO: implement all host types we use
    if (hostType === 'http') {
      // handle Execute time
      // get time-end ASAP
      // const timestampExit = Date.now();
      const httpContext = context.switchToHttp();
      const request: Request = httpContext.getRequest<Request>();
      // get request headers meta
      const reqId = request.header(HEADER_REQUEST_ID);
      const sessionId = request.header(HEADER_SESSION_ID);
      const timestampEntry = request.header(HEADER_TIMESTAMP_ENTRY);
      // Add headers to response
      const response: Response<any> = httpContext.getResponse<Response<any>>();
      response.header(HEADER_REQUEST_ID, reqId);
      response.header(HEADER_SESSION_ID, sessionId || '0');
      response.header(HEADER_TIMESTAMP_ENTRY, timestampEntry);
      // get Protocol name
      const args = context.getArgs();
      const protocolName = args?.[0]?.params?.protocolName;
      response.header(HEADER_PROTOCOL, protocolName);
    }
    return next.handle() as Observable<R>;
  }
}
