import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { ChainDto } from '@app/common';

import { ChainService } from '../modules/lookup/chain.service';

@Controller('chains')
export class ChainController {
  constructor(@Inject(ChainService) private readonly service: ChainService) {}

  @Get('/')
  @ApiOkResponse({ type: ChainDto, isArray: true })
  getAll(): ChainDto[] {
    return this.service.getAll();
  }
}
