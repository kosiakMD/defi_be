import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';
import { HEADER_REQUEST_ID } from '@app/common/constant';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private httpService: HttpService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    let reqId = req.headers[HEADER_REQUEST_ID];
    if (!reqId) {
      reqId = uuid();
      req.headers[HEADER_REQUEST_ID] = reqId;
    }

    // simpler hardcoded variant, left for as example
    this.httpService.axiosRef.defaults.headers.common[HEADER_REQUEST_ID] = reqId as string;

    // in this right case we need to eject() each previous callback
    // because it creates a new callback and assign to the listener callbacks set
    // this.httpService.axiosRef.interceptors.request.use((config) => {
    //   config.headers.common[HEADER_REQUEST_ID] = reqId;
    //
    //   return config;
    // });

    next();
  }
}
