import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsService } from './services/jobs.service';
import { DatabaseService } from './services/database.service';
import { AgendaModule } from 'nestjs-agenda';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoingeckoFirstCheckJob } from './jobs/coingecko_first_check.job'
import { CoingeckoCurrentPricesJob } from './jobs/coingecko.job'
import { NestPgpromiseModule } from 'nestjs-pgpromise';

@Module({
  imports: [
    ConfigModule.forRoot(),
    
    NestPgpromiseModule.register({
      connection: {
        host: '45.63.116.59',
        port: 5432,
        database: 'dashboard', 
        user: 'ollie',
        password: '(8eMPtWDt,9+rurF',
      },
    }),
    AgendaModule.register({ db: { address: 'mongodb://127.0.0.1/agenda' }})
  ],
  controllers: [AppController],
  providers: [AppService, JobsService, DatabaseService, CoingeckoFirstCheckJob, CoingeckoCurrentPricesJob, ConfigService],
})
export class AppModule {}
