import { Request } from 'express';

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EnvEnum, ErrorResponseDto, Logger } from '@app/common';
import { HEADER_REQUEST_ID } from '@app/common/constant';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    protected readonly configService: ConfigService,
  ) {}

  catch(exception: Error, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    // if host.getType() == http
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const request = ctx.getRequest<Request>();

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

    const responseBody: ErrorResponseDto = {
      statusCode: httpStatus,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      // doesn't work but should
      // reqId: request.header(HEADER_REQUEST_ID),
      // reqId: request.get(HEADER_REQUEST_ID),
      reqId: request.headers[HEADER_REQUEST_ID].toString(),
    };

    this.logger.error(
      { ...exception, responseBody: responseBody },
      `${exception.stack || ''}\n  AllExceptionsFilter`,
      'AllExceptionsFilter',
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
