import { Body, Controller, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';

import { CreateChainDto } from '../common/dto/create-chain.dto';
import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

@ApiTags('Chains')
@Controller('v1/chains')
export class ChainsController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @ApiOperation({ summary: 'Get a list of all chains' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Get a list of chains' })
  @Get()
  getAllChains() {
    return this.requestProxy(this.url + 'v1/chains');
  }

  @ApiOperation({ summary: 'Get a chain by id' })
  @ApiParam({ type: Number, name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Get a chain by id' })
  @Get(':id')
  getChainById(@Param('id') id) {
    return this.requestProxy(this.url + `v1/chains/${id}`);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chain' })
  @ApiBody({ type: CreateChainDto })
  create(@Body() createChainDto) {
    return this.requestProxy(this.url + 'v1/chains', 'POST', createChainDto);
  }

  @ApiOperation({ summary: 'Patch chain by id' })
  @ApiParam({ type: Number, name: 'id' })
  @ApiBody({ type: PartialType(CreateChainDto) })
  @Patch(':id')
  update(@Param('id') id: number, @Body() updateChainDto) {
    return this.requestProxy(this.url + `v1/chains/${id}`, 'PATCH', updateChainDto);
  }
}
