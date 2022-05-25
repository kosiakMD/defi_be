import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags, PartialType } from '@nestjs/swagger';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { EndpointDto } from './dto/Endpoint.dto';
import { ListQueryDto } from './dto/ListQuery.dto';
import { EndpointsListDto } from './dto/endpoints.list.dto';

@ApiTags('RPCEndpoints')
@Controller('v1/rpc-endpoints')
export class EndpointsController extends BaseService implements IBaseService {
  url = `${this.buildUrl(
    this.configService.get<string>('RPC_SERVICE_HOST'),
    this.configService.get<string>('RPC_SERVICE_PORT'),
  )}v1/endpoints`;

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsListDto })
  get(@Query() query: ListQueryDto): Promise<EndpointsListDto> {
    return this.requestProxy(this.url, 'GET', query);
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointDto })
  findOne(@Param('id') id: number): Promise<EndpointDto> {
    return this.requestProxy(this.url + `/${id}`);
  }

  @ApiBody({ type: PartialType(EndpointDto) })
  @Post('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointDto })
  post(@Body() body: Partial<EndpointDto>): Promise<EndpointDto> {
    return this.requestProxy(this.url, 'POST', body);
  }

  @ApiBody({ type: PartialType(EndpointDto) })
  @Put('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointDto })
  put(@Param('id') id: number, @Body() body: Partial<EndpointDto>): Promise<EndpointDto> {
    return this.requestProxy(this.url + `/${id}`, 'POST', body);
  }

  @Delete('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  delete(@Param('id') id: number): Promise<void> {
    return this.requestProxy(this.url + `/${id}`, 'DELETE');
  }
}
