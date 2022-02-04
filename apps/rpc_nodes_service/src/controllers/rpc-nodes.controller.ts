import { NextFunction, Request, Response } from 'express';

import {
  All,
  CacheInterceptor,
  Controller,
  HttpStatus,
  Inject,
  Next,
  Param,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { RPCParamsDto } from '../modules/rpc_nodes/dto/rpc-params.dto';
import { RPCNodesService } from '../modules/rpc_nodes/rpc-nodes.service';

@ApiTags('RPC')
@Controller('rpc')
export class RPCNodesController {
  constructor(
    private rpcNodesService: RPCNodesService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @ApiParam({ name: 'chainId', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: Object })
  @UseInterceptors(CacheInterceptor)
  @All('/:chainId') // TODO find out how to reflect '@All' on Swagger
  all(
    @Param() params: RPCParamsDto,
    @Req() request: Request,
    @Res() response: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    const { chainId } = params;
    return this.rpcNodesService.proxyRPCCall(chainId, { request, response, next });
  }
}
