import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { CaptureContext } from '@sentry/types';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';

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

interface SentryEntry {
  body: any;
  origin: any;
  action: any;
}

function sentryLog(
  err: Error | string,
  sentryParams: CaptureContext,
  severity: Severity,
  entry: SentryEntry,
) {
  Sentry.withScope((scope) => {
    scope.setExtra('body', entry.body);
    scope.setExtra('origin', entry.origin);
    scope.setExtra('action', entry.action);
    scope.setLevel(severity);

    typeof err === 'string'
      ? Sentry.captureMessage(err, sentryParams)
      : Sentry.captureException(err, sentryParams);
  });
}

@Injectable()
export class SentryInterceptor<R = any, T = any> implements NestInterceptor<R, T> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  intercept(
    context: ExecutionContext,
    next: CallHandler<R>,
  ): Observable<T> | Promise<Observable<T>> {
    const className = context.getClass().name;

    // TODO: temporary enabled only for protocols and health checks
    if (allowedControllers.includes(className)) {
      let contextHttp: HttpArgumentsHost,
        request: Request,
        reqId: string,
        sessionId: string,
        path: string,
        timestampEntry: string,
        timestampExit: string,
        timeExecute: string;

      const hostType = context.getType();

      if (hostType === 'http') {
        contextHttp = context.switchToHttp();
        request = contextHttp.getRequest<Request>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        path = request._parsedUrl.path;
        reqId = request.header(HEADER_REQUEST_ID)?.toString();
        sessionId = request.header(HEADER_SESSION_ID)?.toString();
        timestampEntry = request.header(HEADER_TIMESTAMP_ENTRY)?.toString();
        timestampExit = request.header(HEADER_TIMESTAMP_EXIT)?.toString();
        timeExecute = request.header(HEADER_TIME_EXECUTE)?.toString();
      }

      const args = context.getArgs();
      const sentryMeta = {
        path,
        className,
        reqId,
        sessionId,
        timestampEntry,
        timestampExit,
        timeExecute,
        protocolName: args?.[0]?.params?.protocolName || null,
      };
      const sentryParams: CaptureContext = {
        level: Severity.Error,
        tags: {
          sessionId,
          className,
          protocolName: args?.[0]?.params?.protocolName || null,
        },
        extra: {
          sentryMeta,
        },
        contexts: {
          ids: {
            sessionId,
            reqId,
          },
        },
        user: {
          sessionId,
          reqId,
          timestampEntry,
          timestampExit,
          timeExecute,
        },
      };

      const { method, body, url } = request;

      const entry: SentryEntry = {
        action: method,
        origin: url,
        body: body,
      };

      return next.handle().pipe(
        catchError<T, any>((err) => {
          const severity = err.status && err.status < 500 ? Severity.Warning : Severity.Error;
          sentryLog(err, sentryParams, severity, entry);
          // TODO: test simpler way
          // return throwError(() => err);
          throw err;
        }) as any,
        // TODO: temporary disabled
        //   tap<T>(null, (exception) => {
        //     Sentry.captureException(exception, sentryParams);
        //   }) as any,
      ) as unknown as Observable<T>;
    }

    return next.handle() as unknown as Observable<T>;
  }
}
