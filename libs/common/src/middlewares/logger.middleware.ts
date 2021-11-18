import { NextFunction, Request, Response } from 'express';

import { Inject, Injectable, LoggerService, NestMiddleware } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    this.logger.log(
      {
        ip: req.ip,
        ips: req.ips,
        method: req.method,
        hostname: req.hostname,
        baseUrl: req.baseUrl,
        path: req.path,
        url: req.url,
        params: req.params,
        body: this.getBodyMessage(req),
      },
      req.method,
    );
    next();
  }

  getBodyMessage(req: Request): string {
    if (!req.body) {
      return req.body;
    }

    const MAX_BODY_SIZE = 262144;
    const bodyString = JSON.stringify(req.body);
    const size = Buffer.byteLength(bodyString);

    const fallbackMessage = 'Request Body Too Large To Display';
    return size < MAX_BODY_SIZE ? bodyString : fallbackMessage;
  }
}
