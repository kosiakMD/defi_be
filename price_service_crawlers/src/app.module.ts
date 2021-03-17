import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsService } from './services/jobs.service';
import { AgendaModule } from 'nestjs-agenda';

import { NestPgpromiseModule } from 'nestjs-pgpromise';

@Module({
  imports: [
   
    AgendaModule.register({ db: { address: 'mongodb://127.0.0.1/agenda' }})
  ],
  controllers: [AppController],
  providers: [AppService, JobsService],
})
export class AppModule {}
