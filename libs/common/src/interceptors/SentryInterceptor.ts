import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

import {
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

const allowedControllers = [
  'HealthController', // test control
  'IntegrationsController',
  'IntegrationsControllerV2',
  'ProtocolController',
  'ProtocolControllerV2',
];

@Injectable()
export class SentryInterceptor<R = any, T = any> implements NestInterceptor<R, T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<R>,
  ): Observable<T> | Promise<Observable<T>> {
    const className = context.getClass().name;

    // TODO: temporary enabled only for protocols and health checks
    if (allowedControllers.includes(className)) {
      let reqId, sessionId, timestampEntry, timestampExit, timeExecute;
      const hostType = context.getType();
      if (hostType === 'http') {
        const contextHttp = context.switchToHttp();
        const request: Request = contextHttp.getRequest<Request>();
        reqId = request.header(HEADER_REQUEST_ID)?.toString();
        sessionId = request.header(HEADER_SESSION_ID)?.toString();
        timestampEntry = request.header(HEADER_TIMESTAMP_ENTRY)?.toString();
        timestampExit = request.header(HEADER_TIMESTAMP_EXIT)?.toString();
        timeExecute = request.header(HEADER_TIME_EXECUTE)?.toString();
      }

      const args = context.getArgs();
      const sentryMeta = {
        className,
        reqId,
        sessionId,
        timestampEntry,
        timestampExit,
        timeExecute,
        protocolName: args?.[0]?.params?.protocolName,
      };
      const sentryParams = {
        level: Severity.Error,
        tags: sentryMeta,
        extra: sentryMeta,
      };

      return next.handle().pipe(
        catchError<T, any>((exception) => {
          Sentry.captureException(exception, sentryParams);
          throwError(exception);
        }) as any,
        tap<T>(null, (exception) => {
          Sentry.captureException(exception, sentryParams);
        }) as any,
      ) as unknown as Observable<T>;
    }

    return next.handle() as unknown as Observable<T>;
  }
}
