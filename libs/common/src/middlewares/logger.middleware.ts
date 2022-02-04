import { NextFunction, Request, Response } from 'express';

import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { HEADER_REQUEST_ID, HEADER_SESSION_ID } from '@app/common/constant';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const { originalUrl } = req;
    this.logger.time(originalUrl);
    res.on('finish', () => this.logger.timeEnd(originalUrl));

    this.logger.log(
      {
        reqId: req.header(HEADER_REQUEST_ID) || 'unknown',
        sessionId: req.header(HEADER_SESSION_ID),
        ip: req.ip,
        ips: req.ips,
        method: req.method,
        hostname: req.hostname,
        baseUrl: req.baseUrl,
        path: req.path,
        url: req.url,
        params: req.params,
        body: req.body,
      },
      req.method,
    );
    next();
  }
}
