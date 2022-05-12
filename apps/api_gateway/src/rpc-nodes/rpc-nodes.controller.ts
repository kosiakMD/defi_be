import { Request } from 'express';

import {
  CacheInterceptor,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RPCParamsDto } from '../common/DTO/RPCParams.dto';
import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { RPCCallDto } from './dto/RPCCall.dto';
import { RPCResponse } from './dto/RPCResponse.dto';

@ApiTags('RPC-call')
@Controller('v1/rpc-call')
export class RPCNodesController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('RPC_SERVICE_HOST'),
    this.configService.get<string>('RPC_SERVICE_PORT'),
  );

  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Get('/:chainId')
  get(@Param() params: RPCParamsDto, @Query() query: RPCCallDto): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc-call/${chainId}`, 'POST', query);
  }

  @ApiBody({ type: RPCCallDto })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Post('/:chainId')
  post(@Param() params: RPCParamsDto, @Req() request: Request): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc-call/${chainId}`, 'POST', request.body);
  }

  @ApiBody({ type: RPCCallDto })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Patch('/:chainId')
  patch(@Param() params: RPCParamsDto, @Req() request: Request): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc-call/${chainId}`, 'POST', request.body);
  }

  @ApiBody({ type: RPCCallDto })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @Put('/:chainId')
  put(@Param() params: RPCParamsDto, @Req() request: Request): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc-call/${chainId}`, 'POST', request.body);
  }

  @ApiBody({ type: RPCCallDto })
  @ApiResponse({ status: HttpStatus.OK, type: RPCResponse })
  @UseInterceptors(CacheInterceptor)
  @ApiBody({ type: Object })
  @Delete('/:chainId')
  delete(@Param() params: RPCParamsDto, @Req() request: Request): Promise<void> {
    const { chainId } = params;
    return this.requestProxy(this.url + `v1/rpc-call/${chainId}`, 'POST', request.body);
  }
}
