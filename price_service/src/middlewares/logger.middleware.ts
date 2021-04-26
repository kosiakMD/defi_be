import { Inject, Injectable, LoggerService, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    this.logger.debug(
      {
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
