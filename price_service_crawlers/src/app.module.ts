import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsService } from './services/jobs.service';
import { DatabaseService } from './services/database.service';
import { AgendaModule } from 'nestjs-agenda';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoingeckoFirstCheckJob } from './jobs/coingecko_first_check.job'
import { CoingeckoCurrentPricesJob } from './jobs/coingecko_current_prices.job'
import { NestPgpromiseModule } from 'nestjs-pgpromise';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env'
    }),
    
    NestPgpromiseModule.register({
      connection: {
        host: process.env.TYPEORM_HOST,
        port: parseInt(process.env.TYPEORM_PORT),
        database: process.env.TYPEORM_DATABASE, 
        user: process.env.TYPEORM_USERNAME,
        password: process.env.TYPEORM_PASSWORD
      },
    }),
    AgendaModule.register({ db: { address: 'mongodb://127.0.0.1/agenda' }})
  ],
  controllers: [AppController],
  providers: [AppService, JobsService, DatabaseService, CoingeckoFirstCheckJob, CoingeckoCurrentPricesJob, ConfigService],
})
export class AppModule {}
