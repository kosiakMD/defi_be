import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

import { HttpService, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const reqId = uuid();

    req.headers['x-req-uuid'] = reqId;

    // simpler hardcoded variant, left for as example
    // this.httpService.axiosRef.defaults.headers.common['x-req-uuid'] = reqId;
    this.httpService.axiosRef.interceptors.request.use((config) => {
      config.headers.common['x-req-uuid'] = reqId;

      return config;
    });

    next();
  }
}
