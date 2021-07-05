import { Controller, Get } from '@nestjs/common';

import { TemporaryTokensService } from './temporary.tokens.service';

@Controller('temporary-tokens')
export class TemporaryTokensController {
  constructor(private parsingService: TemporaryTokensService) {}

  @Get()
  async addEthTokensToDb(): Promise<void> {
    await this.parsingService.getTemporaryTokens();
  }
}
