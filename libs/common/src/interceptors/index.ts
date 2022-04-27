import { APP_INTERCEPTOR } from '@nestjs/core';

import { HeadersExitInterceptor } from '@app/common/interceptors/headers-exit.interceptor';

import { HeadersEntryInterceptor } from './headers-entry.interceptor';
import { ResponseInterceptor } from './response.interceptor';
import { SentryInterceptor } from './sentry.interceptor';

export const interceptorsOrder = [
  {
    provide: APP_INTERCEPTOR,
    useClass: HeadersEntryInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: SentryInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: HeadersExitInterceptor,
  },
];
