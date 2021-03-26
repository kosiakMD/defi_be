import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsService } from './services/jobs.service';
import { DatabaseService } from './services/database.service';
import { AgendaModule } from 'nestjs-agenda';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoingeckoFirstCheckJob } from './jobs/coingecko_first_check.job'
import { CoingeckoCurrentPricesJob } from './jobs/coingecko_current_prices.job'
import { SushiSwapFirstCheckJob } from './jobs/sushiswap_first_check.job'
import { SushiswapCurrentPricesJob } from './jobs/sushiswap_current_prices.job'
import { UniswapCurrentPricesJob } from './jobs/uniswap_current_prices.job'
import { UniSwapFirstCheckJob } from './jobs/uniswap_first_check.job'
import { BalancerFirstCheckJob } from './jobs/balancer_first_check.job'
import { NestPgpromiseModule } from 'nestjs-pgpromise';
import { Api } from './thegraph/api';
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
    //mongodb://secretuserforhitclub:moresecretpassforhitclub@89.111.132.126:27017/dJob?authMechanism=DEFAULT&authSource=admin
    AgendaModule.register({ db: { 
      address: 'mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASS+'@'+process.env.MONGO_HOST+':'+process.env.MONGO_PORT+'/agenda?authMechanism=DEFAULT&authSource=admin'
      }})
  ],
  controllers: [AppController],
  providers: [AppService, JobsService, DatabaseService, Api, 
     CoingeckoFirstCheckJob, 
     CoingeckoCurrentPricesJob, 
     ConfigService,
     SushiswapCurrentPricesJob,
     SushiSwapFirstCheckJob,
     UniswapCurrentPricesJob,
     UniSwapFirstCheckJob,
     BalancerFirstCheckJob
    ],
})
export class AppModule {}
