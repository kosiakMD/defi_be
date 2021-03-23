import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Injectable ,Inject} from '@nestjs/common';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    @Inject(NEST_PGPROMISE_CONNECTION) private  pg: IDatabase<any>) {}

  @Get()
  getPing(): string {
   
    return this.appService.getPing();
  }
}
