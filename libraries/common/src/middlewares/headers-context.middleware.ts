import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { HEADER_REQUEST_ID, HEADER_SESSION_ID, HEADER_TIMESTAMP_ENTRY } from '@app/common/constant';
import { Logger } from '@app/common/logger';

@Injectable()
export class HeadersContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    req.headers[HEADER_TIMESTAMP_ENTRY] = Date.now().toString();

    let reqId = req.header(HEADER_REQUEST_ID);
    if (!reqId) {
      reqId = uuid();
      req.headers[HEADER_REQUEST_ID] = reqId; // hard override if no method to change/set as it's Request, not Resp
    }

    // in this right case we need to eject() each previous callback
    // because it creates a new callback and assign to the listener callbacks set
    // this.httpService.axiosRef.interceptors.request.use((config) => {
    //   config.headers.common[HEADER_REQUEST_ID] = reqId;
    //   return config;
    // });
    const sessionId = req.header(HEADER_SESSION_ID);
    // simpler hardcoded variant, left for as example
    if (reqId)
      this.httpService.axiosRef.defaults.headers.common[HEADER_REQUEST_ID] = reqId as string;
    if (sessionId)
      this.httpService.axiosRef.defaults.headers.common[HEADER_SESSION_ID] = sessionId as string;

    next();
  }
}
