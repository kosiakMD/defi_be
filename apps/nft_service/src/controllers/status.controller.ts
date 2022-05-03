import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Common')
@Controller('')
export class StatusController {
  @Get('/v1/status')
  public async status() {
    return {
      status: 'OK',
    };
  }
}
