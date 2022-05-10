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
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags, PartialType } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { FindOneParamsDto } from '../common/dto/FindOneParams.dto';
import { ListQueryDto } from '../common/dto/ListQuery.dto';

import { EndpointCreateDto } from '../modules/endpoints/dto/endpoint.create.dto';
import { EndpointDto } from '../modules/endpoints/dto/endpoint.dto';
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
  get(@Query() query: ListQueryDto): Promise<EndpointsListDto> {
    return this.endpointsService.getEndpointsList(query);
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  findOne(@Param() params: FindOneParamsDto): Promise<EndpointsEntity> {
    const { id } = params;
    return this.endpointsService.getEndpointById(id);
  }

  @Post('/')
  @ApiBody({ type: PartialType(EndpointDto) })
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  post(@Query() query: EndpointCreateDto): Promise<EndpointsEntity> {
    return this.endpointsService.createEndpoint(query);
  }

  @Put('/:id')
  @ApiBody({ type: PartialType(EndpointDto) })
  @ApiResponse({ status: HttpStatus.OK, type: EndpointsEntity })
  put(
    @Param() params: FindOneParamsDto,
    @Query() query: EndpointUpdateDto,
  ): Promise<EndpointsEntity> {
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
