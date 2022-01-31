import { Request } from 'express';

import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { FindOneParamsDto } from '../common/dto/FindOneParams.dto';
import { ListQueryDto } from '../common/dto/ListQuery.dto';

import { EndpointCreateDto } from '../modules/endpoints/dto/endpoint.create.dto';
import { EndpointUpdateDto } from '../modules/endpoints/dto/endpoint.update.dto';
import { EndpointsListDto } from '../modules/endpoints/dto/endpoints.list.dto';
import { EndpointsEntity } from '../modules/endpoints/endpoints.entity';
import { EndpointsService } from '../modules/endpoints/services/endpoints.service';

@ApiTags('Endpoints')
@Controller('endpoints')
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsListDto })
  get(@Query() query: ListQueryDto, @Req() request: Request): Promise<EndpointsListDto> {
    this.logger.time(request.originalUrl);
    return this.endpointsService
      .getEndpointsList(query) //
      .finally(() => this.logger.timeEnd(request.originalUrl));
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  findOne(@Param() params: FindOneParamsDto, @Req() request: Request): Promise<EndpointsEntity> {
    this.logger.time(request.originalUrl);
    const { id } = params;
    return this.endpointsService
      .getEndpointById(id) //
      .finally(() => this.logger.timeEnd(request.originalUrl));
  }

  @Post('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  post(@Query() query: EndpointCreateDto, @Req() request: Request): Promise<EndpointsEntity> {
    this.logger.time(request.originalUrl);
    return this.endpointsService
      .createEndpoint(query) //
      .finally(() => this.logger.timeEnd(request.originalUrl));
  }

  @Put('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  put(
    @Param() params: FindOneParamsDto,
    @Query() query: EndpointUpdateDto,
    @Req() request: Request,
  ): Promise<EndpointsEntity> {
    this.logger.time(request.originalUrl);
    const { id } = params;
    return this.endpointsService
      .updateEndpoint(id, query) //
      .finally(() => this.logger.timeEnd(request.originalUrl));
  }

  @Delete('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  delete(@Param() params: FindOneParamsDto, @Req() request: Request): Promise<void> {
    this.logger.time(request.originalUrl);
    const { id } = params;
    return this.endpointsService
      .deleteEndpoint(id) //
      .finally(() => this.logger.timeEnd(request.originalUrl));
  }
}
