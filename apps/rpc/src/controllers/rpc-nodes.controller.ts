import { Request, Response } from 'express';

import {
  CacheInterceptor,
  Controller,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { RPCCallDto } from '../common/dto/RPCCall.dto';
import { RPCResponse } from '../common/dto/RPCResponse.dto';

import { RPCParamsDto } from '../modules/rpc/dto/rpc-params.dto';
import { RpcService } from '../modules/rpc/rpc.service';

@ApiTags('RPC')
@Controller('rpc-call')
export class RPCNodesController {
  constructor(
    private rpcNodesService: RpcService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @ApiBody({ type: RPCCallDto })
  @ApiParam({ name: 'chainId', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Post('/:chainId/archive') // TODO find out how to reflect '@All' on Swagger
  postArchive(
    @Param() params: RPCParamsDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { chainId } = params;
    return this.rpcNodesService.proxyRPCCall({
      archive: true,
      chainId,
      request,
      response,
    });
  }

  @ApiBody({ type: RPCCallDto })
  @ApiParam({ name: 'chainId', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Post('/:chainId') // TODO find out how to reflect '@All' on Swagger
  post(
    @Param() params: RPCParamsDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { chainId } = params;
    return this.rpcNodesService.proxyRPCCall({
      archive: false,
      chainId,
      request,
      response,
    });
  }
}
