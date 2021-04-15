import { Controller, Get } from '@nestjs/common';

@Controller('examples')
export class ExamplesController {
  @Get('/')
  findAll(): string {
    return 'This action returns all examples';
  }
}
