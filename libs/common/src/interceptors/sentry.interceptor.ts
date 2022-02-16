import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { Request } from 'express';
import { Observable } from 'rxjs';
// import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

// import { catchError } from 'rxjs/operators';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

import { HEADER_REQUEST_ID, HEADER_SESSION_ID } from '@app/common/constant';

const allowedControllers = [
  'HealthController', // test control
  'IntegrationsController',
  'IntegrationsControllerV2',
  'ProtocolController',
  'ProtocolControllerV2',
];

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const className = context.getClass().name;
    const handler = next.handle();
    // console.log('className', className);
    // TODO: temporary enabled only for protocols and health checks
    if (allowedControllers.includes(className)) {
      // const args = context.getArgs();
      let reqId, sessionId;
      const hostType = context.getType();
      if (hostType === 'http') {
        const contextHttp = context.switchToHttp();
        const request: Request = contextHttp.getRequest<Request>();
        reqId = request.header(HEADER_REQUEST_ID)?.toString();
        sessionId = request.header(HEADER_SESSION_ID)?.toString();
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handler.pipe(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // catchError((exception) => {
        //   console.log('exception', exception);
        //   Sentry.captureException(exception, {
        //     level: Severity.Error,
        //     extra: {
        //       protocolName: args?.[0]?.params?.protocolName,
        //     },
        //   });
        //   throwError(exception);
        // }),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tap(null, (exception) => {
          const args = context.getArgs();
          // console.log('exception', exception);
          Sentry.captureException(exception, {
            level: Severity.Error,
            tags: {
              protocolName: args?.[0]?.params?.protocolName,
              reqId,
              sessionId,
            },
          });
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return handler;
  }
}
