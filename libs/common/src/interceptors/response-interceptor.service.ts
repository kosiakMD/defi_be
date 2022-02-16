import { Observable } from 'rxjs';

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

export interface Response<T> {
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
      const request = httpContext.getRequest();
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
      const response = httpContext.getResponse();
      response.header(HEADER_REQUEST_ID, meta.reqId);
      response.header(HEADER_SESSION_ID, meta.sessionId);
      response.header(HEADER_TIMESTAMP_ENTRY, meta.timestampEntry);
      response.header(HEADER_TIMESTAMP_EXIT, meta.timestampExit);
      response.header(HEADER_TIME_EXECUTE, meta.timeExecute);
      // Add Meta for response body
      // TODO: TBD log or not this
      // this.logger.log('intercept reqId', reqId);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return next.handle();
      // return next.handle().pipe(map((data) => Object.assign(data, meta)));
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return next.handle();
    }
  }
}
