import {
  CacheTTL,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags, PartialType } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/logger/logger.service';

import { ListQueryDto } from '../common/dto/list-query.dto';

import { EndpointCreateDto } from '../modules/endpoints/dto/endpoint.create.dto';
import { EndpointDto } from '../modules/endpoints/dto/endpoint.dto';
import { EndpointUpdateDto } from '../modules/endpoints/dto/endpoint.update.dto';
import { EndpointsListDto } from '../modules/endpoints/dto/endpoints.list.dto';
import { EndpointEntity } from '../modules/endpoints/endpoint.entity';
import { EndpointsService } from '../modules/endpoints/services/endpoints.service';
import { FindOneParamsDto } from './find-one-params.dto';

@ApiTags('Endpoints')
@CacheTTL(0.03)
@Controller('endpoints')
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsListDto })
  get(@Query() query: ListQueryDto): Promise<EndpointsListDto> {
    return this.endpointsService.getEndpointsList(query);
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointEntity })
  findOne(@Param() params: FindOneParamsDto): Promise<EndpointEntity> {
    const { id } = params;
    return this.endpointsService.getEndpointById(id);
  }

  @Post('/')
  @ApiBody({ type: PartialType(EndpointDto) })
  @ApiResponse({ status: HttpStatus.OK, type: EndpointEntity })
  post(@Query() query: EndpointCreateDto): Promise<EndpointEntity> {
    return this.endpointsService.createEndpoint(query);
  }

  @Put('/:id')
  @ApiBody({ type: PartialType(EndpointDto) })
  @ApiResponse({ status: HttpStatus.OK, type: EndpointEntity })
  put(
    @Param() params: FindOneParamsDto,
    @Query() query: EndpointUpdateDto,
  ): Promise<EndpointEntity> {
    const { id } = params;
    return this.endpointsService.updateEndpoint(id, query);
  }

  @Delete('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  delete(@Param() params: FindOneParamsDto): Promise<void> {
    const { id } = params;
    return this.endpointsService.deleteEndpoint(id);
  }
}
