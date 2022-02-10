import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { HEADER_REQUEST_ID, HEADER_SESSION_ID } from '@app/common/constant';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformHeadersInterceptor<T> implements NestInterceptor<T, Response<T>> {
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
      const reqId = request.header(HEADER_REQUEST_ID);
      const sessionId = request.header(HEADER_SESSION_ID);
      // TODO: TBD log or not this
      // this.logger.log('intercept reqId', reqId);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return next.handle().pipe(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        map((data) => {
          data.meta = { reqId, sessionId, timestampEntry: new Date().toISOString() };
          return data;
        }),
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return next.handle();
    }
  }
}
