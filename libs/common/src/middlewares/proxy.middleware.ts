// import * as proxy from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { Inject, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../logger';

export class ProxyMiddleware implements NestMiddleware {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  private proxy = createProxyMiddleware({
    target: `${process.env.VAULTS_SERVICE_URL}`, // /${process.env.VAULTS_PATH}
    pathRewrite: {
      '^/v1/vaults': '/vaults',
    },
    secure: false,
    onProxyReq: (proxyReq, req) => {
      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        `Proxying ${req.method} request originally made to '${req.originalUrl}'...`,
        'NestMiddleware',
      );
    },
  });

  use(req: Request, res: Response, next: () => void): void {
    this.proxy(req as any, res as any, next);
  }
}
