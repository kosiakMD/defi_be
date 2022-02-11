import * as Sentry from '@sentry/minimal';
import { Severity } from '@sentry/node';
import { Observable } from 'rxjs';
// import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

// import { catchError } from 'rxjs/operators';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

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

      // console.log('LogException', className);
      // console.log('args', args);

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
            extra: {
              protocolName: args?.[0]?.params?.protocolName,
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
