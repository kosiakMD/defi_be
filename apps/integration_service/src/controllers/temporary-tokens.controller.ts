import { Controller, Get } from '@nestjs/common';

import { TemporaryTokensService } from '../modules/temporary-tokens/services/temporary-tokens.service';

@Controller('v1/temporary-tokens')
export class TemporaryTokensController {
  constructor(private parsingService: TemporaryTokensService) {}

  @Get()
  async addEthTokensToDb(): Promise<void> {
    await this.parsingService.getTemporaryTokens();
  }
}
