import { Observable } from 'rxjs';

import { ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { HEADER_REQUEST_ID } from '@app/common/constant';

@Injectable()
export class TransformHeadersInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  intercept(context: ExecutionContext, call$: Observable<any>): Observable<any> {
    const reqId = context.switchToHttp().getRequest().headers[HEADER_REQUEST_ID];
    this.logger.log('intercept reqId', reqId);

    return call$;
  }
}
