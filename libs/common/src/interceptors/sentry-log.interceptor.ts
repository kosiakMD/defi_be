import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { CaptureContext } from '@sentry/types';
import { Request as NodeRequest, Response } from 'express';
import { tap } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';

import { ResponseMetaDto } from '@app/common';
import {
  HEADER_PROTOCOL,
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIME_ENTRY,
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

interface Request extends NodeRequest {
  _parsedUrl: {
    protocol: string;
    slashes: string;
    auth: string;
    host: string;
    port: string;
    hostname: string;
    hash: string;
    search: string;
    query: string;
    pathname: string;
    path: string;
    href: string;
    _raw: string;
  };
}

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

interface SentryMeta extends ResponseMetaDto {
  [key: string]: string;
}

@Injectable()
// export class SentryLogInterceptor<T = any, R = any> implements NestInterceptor<T, R> {
export class SentryLogInterceptor implements NestInterceptor {
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

  intercept(
    context: ExecutionContext,
    // next: CallHandler<T | R>,
    next: CallHandler,
  ) {
    return next.handle().pipe(
      tap({
        next: null,
        error: (err) => {
          const controllerName = context.getClass().name;

          // TODO: temporary enabled only for protocols and health checks
          // if (allowedControllers.includes(controllerName)) {
          let contextHttp: HttpArgumentsHost,
            request: Request,
            response: Response,
            reqId: string,
            sessionId: string,
            path: string,
            timeEntry: string,
            timestampEntry: string,
            timestampExit: string,
            timeExecute: string,
            protocolName: string;

          const hostType = context.getType();

          // TODO: provide same logic for other protocols if will be needed
          if (hostType === 'http') {
            contextHttp = context.switchToHttp();
            request = contextHttp.getRequest<Request>();
            response = contextHttp.getResponse<Response>();
            path = request.originalUrl;
            reqId = response.get(HEADER_REQUEST_ID);
            sessionId = response.get(HEADER_SESSION_ID);
            timeEntry = response.get(HEADER_TIME_ENTRY);
            timestampEntry = response.get(HEADER_TIMESTAMP_ENTRY);
            timestampExit = response.get(HEADER_TIMESTAMP_EXIT);
            timeExecute = response.get(HEADER_TIME_EXECUTE);
            protocolName = response.get(HEADER_PROTOCOL);
          }

          const sentryMeta: SentryMeta = {
            path,
            controllerName,
            reqId,
            sessionId,
            timestampEntry,
            timestampExit,
            timeEntry,
            timeExecute,
            protocolName,
          };
          const sentryParams: CaptureContext = {
            level: Severity.Error,
            tags: {
              sessionId,
              controllerName,
              protocolName,
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

          const severity = err.status && err.status < 500 ? Severity.Warning : Severity.Error;
          this.sentryLog(err, sentryParams, severity, entry);
          return err;
        },
      }),
    );
  }
}
