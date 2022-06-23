// import * as fs from 'fs';
// import { createProxyMiddleware } from 'http-proxy-middleware';
// import { HttpsProxyAgent } from 'https-proxy-agent'
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger';

import { EndpointCallScore } from '../endpoints/endpoints.enums';
import { EndpointsStatisticService } from '../endpoints/services/endpoints-statistic.service';

@Injectable()
export class RpcService {
  private readonly maxRetries: number;
  constructor(
    protected httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly endpointsStatisticService: EndpointsStatisticService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.maxRetries = Number(this.configService.get('RPC_NODES_MAX_RETRIES'));
  }

  async proxyRPCCall({ chainId, archive, request, response }): Promise<void> {
    const endpoints = this.endpointsStatisticService.getEndpointByPriority(chainId, archive);
    if (!endpoints?.length) {
      return response.status(409).json({ error: `No endpoints for chainId ${chainId}` });
    }

    let index = 0;
    let retries = this.maxRetries || 3;

    while (retries >= 0) {
      const endpoint = endpoints[index];
      const success = await this.makeRPCCall(endpoint.endpoint, request, response);
      const score = success ? EndpointCallScore.success : EndpointCallScore.fail;
      this.endpointsStatisticService
        .updateEndpointSuccessRate(endpoint, score)
        .catch((error) => this.logger.error('Update endpoint statistic failed', error));

      if (success) {
        return;
      }

      // Loop thought all endpoints in round-robin
      index = (index + 1) % endpoints.length;
      retries--;
    }
    response
      .status(418)
      .json({ error: `Sorry, no one of endpoints for chainId ${chainId} replies with success` });
  }

  private async makeRPCCall(
    target: string,
    request: Request,
    response: Response,
  ): Promise<boolean> {
    return new Promise((ok) => {
      const started = Date.now();
      // TODO: Comment that out as cannot switch log level (to be reverted)
      // this.logger.debug(`Proxying RPC request to '${target}'`);
      firstValueFrom(this.httpService.post(target, request.body)).then(
        ({ data, status }) => {
          const took = Date.now() - started;

          const responseString = JSON.stringify(data)?.toLowerCase() || '';
          const isFailedResponse = wrongRpcResponsePatterns.some(
            (pattern) => responseString.indexOf(pattern) >= 0,
          );
          if (isFailedResponse) {
            this.logger.error({
              message: `Proxying RPC request to '${target}' failed. Took ${took}`,
              target,
              took,
              data,
            });
            ok(false);
          } else {
            this.logger.log({
              message: `Proxying RPC request to '${target}' successful. Took ${took}`,
              target,
              took,
            });
            response.status(status).json(data);
            ok(true);
          }
        },
        (error) => {
          const took = Date.now() - started;
          this.logger.error(
            {
              message: `Proxying RPC request to '${target}' failed. Error: ${error.message}. Took ${took}`,
              target,
              took,
            },
            error,
          );
          ok(false);
        },
      );
    });
  }
}

const wrongRpcResponsePatterns = ['invalid', 'error'];
