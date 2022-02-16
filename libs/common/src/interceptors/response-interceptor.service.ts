import { Request, Response as EResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, ResponseMetaDto } from '@app/common';
import {
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

export interface Response<T> extends EResponse<T, any> {
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // TODO handle new types as older are not supported
  // intercept(context: ExecutionContext, call$: Observable<any>): Observable<Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const hostType = context.getType();
    // TODO: implement all host types we use
    // 'http' | 'ws' | 'rpc'
    // const context = host.switchToWs();
    if (hostType === 'http') {
      const httpContext = context.switchToHttp();
      const request: Request = httpContext.getRequest<Request>();
      // init Meta Data
      const reqId = request.header(HEADER_REQUEST_ID);
      const sessionId = request.header(HEADER_SESSION_ID);
      const timestampEntry = Number(request.header(HEADER_TIMESTAMP_ENTRY));
      const timestampExit = Date.now();
      const timeExecute = timestampExit - timestampExit;
      // create Meta Object
      const meta: ResponseMetaDto = {
        reqId,
        sessionId,
        timestampEntry: timestampEntry.toString(),
        timestampExit: timestampExit.toString(),
        timeExecute: timeExecute.toString(),
      };
      // Add Meta for response headers
      const response: Response<any> = httpContext.getResponse<Response<any>>();
      response.header(HEADER_REQUEST_ID, meta.reqId);
      response.header(HEADER_SESSION_ID, meta.sessionId);
      response.header(HEADER_TIMESTAMP_ENTRY, meta.timestampEntry);
      response.header(HEADER_TIMESTAMP_EXIT, meta.timestampExit);
      response.header(HEADER_TIME_EXECUTE, meta.timeExecute);
      // Log Response Meta only
      const args = context.getArgs();
      this.logger.log(
        { ...meta, type: 'RESPONSE', protocolName: args?.[0]?.params?.protocolName },
        'RESPONSE',
      );
      // Add Meta for response body
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // TODO: for debug reason
      return next.handle().pipe(map((data) => Object.assign(data, meta)));
      // return next.handle();
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return next.handle();
    }
  }
}
