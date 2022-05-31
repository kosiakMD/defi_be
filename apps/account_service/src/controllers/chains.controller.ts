import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';

import { CreateChainDto } from '../common/dto/CreateChain.dto';

import { ChainsService } from '../modules/chains/chains.service';

@ApiTags('Chains')
@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @ApiOperation({ summary: 'Get a list of all chains' })
  @ApiResponse({ status: 200, description: 'Get a list of chains' })
  @Get()
  getAllChains() {
    return this.chainsService.getAll();
  }

  @ApiOperation({ summary: 'Get a chain by id' })
  @ApiParam({ type: Number, name: 'id' })
  @ApiResponse({ status: 200, description: 'Get a chain by id' })
  @Get(':id')
  getChainById(@Param('id') id) {
    return this.chainsService.get(id);
  }

  @ApiOperation({ summary: 'Create a new chain' })
  @ApiBody({ type: CreateChainDto })
  @Post()
  create(@Body() createChainDto) {
    return this.chainsService.create(createChainDto);
  }

  @ApiOperation({ summary: 'Patch chain by id' })
  @ApiParam({ type: Number, name: 'id' })
  @ApiBody({ type: PartialType(CreateChainDto) })
  @Patch(':id')
  update(@Param('id') id: number, @Body() updateChainDto) {
    return this.chainsService.patch(id, updateChainDto);
  }
}
