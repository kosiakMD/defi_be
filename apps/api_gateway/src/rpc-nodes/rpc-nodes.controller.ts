import { Request } from 'express';

import {
  All,
  CacheInterceptor,
  Controller,
  HttpStatus,
  Param,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { RPCParamsDto } from '../common/DTO/RPCParams.dto';
import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

@ApiTags('RPC-call')
@Controller('v1/rpc-call')
export class RPCNodesController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('RPC_SERVICE_HOST'),
    this.configService.get<string>('RPC_SERVICE_PORT'),
  );

  @ApiResponse({ status: HttpStatus.OK, type: Object })
  @UseInterceptors(CacheInterceptor)
  @All('/:chainId') // TODO find out how to reflect '@All' on Swagger
  all(@Param() params: RPCParamsDto, @Req() request: Request): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc/${chainId}`, 'POST', request.body);
  }
}
