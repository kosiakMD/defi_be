// import * as fs from 'fs';
// import { createProxyMiddleware } from 'http-proxy-middleware';
// import { HttpsProxyAgent } from 'https-proxy-agent'
import { Request, Response } from 'express';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';
import { HEADER_REQUEST_ID } from '@app/common/constant';

import { EndpointsSuccessScore } from '../endpoints/endpoints.enums';
import { EndpointsToRPCCallService } from '../endpoints/services/endpoints-to-rpc-call.service';

@Injectable()
export class RPCNodesService {
  private readonly maxRetries: number;
  constructor(
    protected httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly endpointsToRPCCallService: EndpointsToRPCCallService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.maxRetries = Number(this.configService.get('RPC_NODES_MAX_RETRIES'));
  }
  private async makeRPCCall(
    target: string,
    request: Request,
    response: Response,
  ): Promise<boolean> {
    return new Promise((ok) => {
      this.logger.log(
        `Proxying RPC request ID: ${request.headers[HEADER_REQUEST_ID]} originally made to '${request.originalUrl}'...`,
      );
      this.httpService
        .post(target, request.body)
        .pipe()
        .toPromise()
        .then(
          ({ data, status }) => {
            this.logger.log(
              `Proxying RPC response successful, request ID: ${request.headers[HEADER_REQUEST_ID]}`,
            );
            response.status(status).json(data);
            ok(true);
          },
          (error) => {
            this.logger.error(
              `Proxy RPC request ID: ${request.headers[HEADER_REQUEST_ID]} Error: ${error.message} `,
            );
            ok(false);
          },
        );
    });
  }
  async proxyRPCCall({ chainId, archive, request, response }): Promise<void> {
    const endpointsToRPCCall = this.endpointsToRPCCallService.getEndpointsToRPCCall(
      chainId,
      archive,
    );
    if (!endpointsToRPCCall) {
      response.status(409).json({ error: `No endpoints for chainId ${chainId}` });
    } else {
      for await (const endpointToRPCCall of endpointsToRPCCall) {
        let retries = this.maxRetries || 3;
        while (retries) {
          const callResult = await this.makeRPCCall(
            endpointToRPCCall.endpointsEntity.endpoint,
            request,
            response,
          );
          const endpointSuccessScore = callResult
            ? EndpointsSuccessScore.success
            : EndpointsSuccessScore.fail;
          this.endpointsToRPCCallService.updateEndpointSuccessRate(
            endpointToRPCCall,
            endpointSuccessScore,
          );
          if (callResult) {
            return;
          }
          retries -= 1;
        }
      }
      response
        .status(418)
        .json({ error: `Sorry, no one of endpoints for chainId ${chainId} replies with success` });
    }
  }
}
