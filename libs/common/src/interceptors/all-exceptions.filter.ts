import { Request } from 'express';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EnvEnum, ErrorResponseDto, Logger } from '@app/common';
import {
  HEADER_REQUEST_ID,
  HEADER_SESSION_ID,
  HEADER_TIMESTAMP_ENTRY,
  HEADER_TIMESTAMP_EXIT,
} from '@app/common/constant';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    protected readonly configService: ConfigService,
  ) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const hostType = host.getType();
    // TODO: implement all host types we use
    // 'http' | 'ws' | 'rpc'
    // const context = host.switchToWs();
    if (hostType === 'http') {
      const contextHttp = host.switchToHttp();

      const httpStatus =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const request: Request = contextHttp.getRequest<Request>();

      let errorMessage;
      if (
        this.configService.get<EnvEnum>('NODE_ENV') === EnvEnum.production &&
        exception.message.startsWith('connect ECONNREFUSED') &&
        !exception.message.endsWith('Service')
      ) {
        errorMessage = 'connect ECONNREFUSED';
      } else {
        errorMessage = exception.message;
      }

      // In certain situations `httpAdapter` might not be available in the
      // constructor method, thus we should resolve it here.
      const { httpAdapter } = this.httpAdapterHost;
      const args = host.getArgs(); // TODO: m.b. take from request
      const protocolName = args?.[0]?.params?.protocolName;

      // N.B! letters sensitive to register and it's a risky
      const reqId = request.header(HEADER_REQUEST_ID);
      const sessionId = request.header(HEADER_SESSION_ID);
      const timestampEntry = Number(request.header(HEADER_TIMESTAMP_ENTRY));
      const timestampExit = Number(request.header(HEADER_TIMESTAMP_EXIT)) || Date.now();
      const timeExecute = timestampExit - timestampEntry;
      // TODO: m.b. use plainToClass but seems no benefits
      const responseBody: ErrorResponseDto = {
        statusCode: httpStatus,
        message: errorMessage,
        path: httpAdapter.getRequestUrl(request),
        reqId,
        sessionId,
        timestampEntry: timestampEntry.toString(),
        timestampExit: timestampExit.toString(),
        timeExecute: timeExecute.toString(),
        protocolName,
      };

      this.logger.error(
        { ...exception, responseBody: responseBody },
        `${exception.stack || ''}\n${this.constructor.name}`,
        // this.constructor.name,
      );

      httpAdapter.reply(contextHttp.getResponse(), responseBody, httpStatus);
    } else {
      throw exception;
    }
  }
}
