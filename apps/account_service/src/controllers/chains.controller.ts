import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Get a chain by id' })
  @Get(':id')
  getChainById(@Param() id) {
    return this.chainsService.get(id);
  }

  @Post()
  create(@Body() createChainDto) {
    return this.chainsService.create(createChainDto);
  }

  @ApiOperation({ summary: 'Patch chain by id' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChainDto) {
    return this.chainsService.patch(id, updateChainDto);
  }
}
