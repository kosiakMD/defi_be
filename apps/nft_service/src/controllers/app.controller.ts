import { Controller, Get } from '@nestjs/common';

@Controller('')
export class AppController {
  @Get('/v1/status')
  public async status() {
    return {
      status: 'OK',
    };
  }
}
