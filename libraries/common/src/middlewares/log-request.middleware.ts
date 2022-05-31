import { NextFunction, Request, Response } from 'express';

import { Inject, Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import {
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIME_EXECUTE,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

// @Injectable()
@Injectable({ scope: Scope.REQUEST })
export class LogRequestMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { originalUrl } = req;
    this.logger.time(originalUrl);
    const reqId = req.get(HEADER_REQUEST_ID);
    const sessionId = req.get(HEADER_SESSION_ID);
    res.once('finish', () =>
      this.logger.timeEnd(originalUrl, {
        reqId,
        sessionId,
        timestampEntry: req.get(HEADER_TIMESTAMP_ENTRY) || res.get(HEADER_TIMESTAMP_ENTRY),
        timestampExit: res.get(HEADER_TIMESTAMP_EXIT),
        timeExecute: res.get(HEADER_TIME_EXECUTE),
      }),
    );

    // this.logger.setExContext(req, res);

    this.logger.log(
      {
        reqId: reqId || 'unknown',
        sessionId: sessionId,
        timestampEntry: req.get(HEADER_TIMESTAMP_ENTRY),
        ip: req.ip,
        ips: req.ips,
        method: req.method,
        hostname: req.hostname,
        baseUrl: req.baseUrl,
        url: req.url,
        body: req.body,
        // path: req.path, // included in url
        // params: req.params, // params usually empty
      },
      req.method,
    );
    next();
  }
}
