import { Controller, Get } from '@nestjs/common';

import { Pancake } from './interfaces/pancake.interface';
import { PancakesCachedService } from './pancake.cached.service';

@Controller('pancakes')
export class PancakesController {
  constructor(private pancakesCachedService: PancakesCachedService) {}

  @Get('/')
  public async getPancakes(): Promise<Pancake[]> {
    return await this.pancakesCachedService.getPancakes();
  }
}
