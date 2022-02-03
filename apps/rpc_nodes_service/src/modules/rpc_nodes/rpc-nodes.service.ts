import { createProxyMiddleware } from 'http-proxy-middleware';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';
import { HEADER_REQUEST_ID } from '@app/common/constant';

import { EndpointsSuccessScore } from '../endpoints/endpoints.enums';
import { EndpointsToRPCCallService } from '../endpoints/services/endpoints-to-rpc-call.service';
import { IProxyCall } from './rpc-nodes.interfaces';

@Injectable()
export class RPCNodesService {
  private readonly maxReties: number;
  constructor(
    private readonly configService: ConfigService,
    private readonly endpointsToRPCCallService: EndpointsToRPCCallService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.maxReties = Number(this.configService.get('RPC_NODES_MAX_RETRIES'));
  }
  private async makeRPCCall(target: string, proxyCall: IProxyCall): Promise<boolean> {
    return new Promise((ok) => {
      const proxy = createProxyMiddleware({
        target,
        ignorePath: true,
        onProxyReq: (_, req) => {
          this.logger.log(
            `Proxying RPC request ID: ${req.headers[HEADER_REQUEST_ID]} originally made to '${req.originalUrl}'...`,
          );
        },
        onProxyRes: (_, req) => {
          this.logger.log(
            `Proxying RPC response successful, request ID: ${req.headers[HEADER_REQUEST_ID]}`,
          );
          ok(true);
        },
        onError: (error, req) => {
          this.logger.error(
            `Proxy RPC request ID: ${req.headers[HEADER_REQUEST_ID]} Error: ${error.message}`,
          );
          ok(false);
        },
      });
      const { request, response, next } = proxyCall;
      proxy(request, response, next);
    });
  }
  async proxyRPCCall(chainId: number, proxyCall: IProxyCall): Promise<void> {
    const endpointsToRPCCall = this.endpointsToRPCCallService.getEndpointsToRPCCall(chainId);
    if (!endpointsToRPCCall) {
      proxyCall.response.status(409).json({ error: `No endpoints for chainId ${chainId}` });
    } else {
      for await (const endpointToRPCCall of endpointsToRPCCall) {
        let retries = this.maxReties || 3;
        while (retries) {
          const callResult = await this.makeRPCCall(
            endpointToRPCCall.endpointsEntity.endpoint,
            proxyCall,
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
      proxyCall.response
        .status(418)
        .json({ error: `Sorry, no one of endpoints for chainId ${chainId} replies with success` });
    }
  }
}
