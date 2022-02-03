import * as Sentry from '@sentry/minimal';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

const allowedControllers = [
  'HealthController', // test control
  'IntegrationsController',
  'IntegrationsControllerV2',
];

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const className = context.getClass().name;
    const handler = next.handle();
    // TODO: temporary enabled only for protocols and health checks
    if (allowedControllers.includes(className)) {
      handler.pipe(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tap(null, (exception) => {
          Sentry.captureException(exception);
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return handler;
  }
}
