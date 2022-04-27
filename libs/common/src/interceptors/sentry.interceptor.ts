import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { CaptureContext } from '@sentry/types';
import { Request } from 'express';
import { tap } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';

import {
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

// TODO test for all
// const allowedControllers = [
//   'HealthController', // test control
//   'IntegrationsController',
//   'IntegrationsControllerV2',
//   'ProtocolController',
//   'ProtocolControllerV2',
// ];

interface SentryEntry {
  body: any;
  origin: any;
  action: any;
}

@Injectable()
// export class SentryInterceptor<T = any, R = any> implements NestInterceptor<T, R> {
export class SentryInterceptor implements NestInterceptor {
  private sentryLog(
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

  // TODO: for Promise
  // async intercept(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  intercept(
    context: ExecutionContext,
    // next: CallHandler<R>,
    next: CallHandler,
    // TODO: test as promise instead of Stream
    // ): Promise<T> {
    // | Promise<Observable<T>>
    // Observable<T>
  ) {
    const className = context.getClass().name;

    // TODO: temporary enabled only for protocols and health checks
    // if (allowedControllers.includes(className)) {
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
      },
    };

    const { method, body, url } = request;

    const entry: SentryEntry = {
      action: method,
      origin: url,
      body: body,
    };

    return next.handle().pipe(
      // TODO: temporary disabled - better for Promise instead of a stream
      // catchError<T, any>((err) => {
      //   const severity = err.status && err.status < 500 ? Severity.Warning : Severity.Error;
      //   this.sentryLog(err, sentryParams, severity, entry);
      //   // TODO: for Stream
      //   return throwError(() => err);
      //   // TODO: for Promise
      //   // throw err;
      // }) as any,
      tap(null, (err) => {
        const severity = err.status && err.status < 500 ? Severity.Warning : Severity.Error;
        this.sentryLog(err, sentryParams, severity, entry);
      }) as any,
    );
    // TODO: test as promise instead of Stream
    // );
    // as unknown as Observable<R>
    // }
  }
}
