import { Request } from 'express';

import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Req } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { EndpointDto } from './dto/Endpoint.dto';
import { EndpointsListDto } from './dto/endpoints.list.dto';

@ApiTags('RPCEndpoints')
@Controller('v1/rpc-endpoints')
export class EndpointsController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('RPC_SERVICE_HOST'),
    this.configService.get<string>('RPC_SERVICE_PORT'),
  );

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsListDto })
  get(@Req() request: Request): Promise<EndpointsListDto> {
    return this.requestProxy(`${this.url}v1/endpoints`, 'GET', request.query);
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsListDto })
  findOne(@Param('id') id: number): Promise<EndpointsListDto> {
    return this.requestProxy(this.url + `v1/endpoints/${id}`);
  }

  @Post('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointDto })
  post(@Body() body: Partial<EndpointDto>): Promise<EndpointDto> {
    return this.requestProxy(`${this.url}v1/endpoints`, 'POST', body);
  }

  @Put('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointDto })
  put(@Param('id') id: number, @Body() body: Partial<EndpointDto>): Promise<EndpointDto> {
    return this.requestProxy(this.url + `v1/endpoints/${id}`, 'POST', body);
  }

  @Delete('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  delete(@Param('id') id: number): Promise<void> {
    return this.requestProxy(this.url + `v1/endpoints/${id}`, 'DELETE');
  }
}
