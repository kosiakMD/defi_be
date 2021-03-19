import { Injectable, Inject } from '@nestjs/common';
// import { AgendaService } from 'nestjs-agenda';
const Agenda = require('agenda');
import { IDatabase } from 'pg-promise';
// const AgendaService  = require('nestjs-agenda');
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { CoingeckoCurrentPricesJob } from '../jobs/coingecko.job'
import { CoingeckoFirstCheckJob } from '../jobs/coingecko_first_check.job'
import { NEW_TOKENS_SECONDS_INTERVAL, NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
  CURRENT_PRICE_SECONDS_INTERVAL } from '../utils/constants';
  import { DatabaseService } from '../services/database.service';
// import axios from 'axios';
// import rateLimit from 'axios-rate-limit';

 
// NOTE: We are limited to 10 bu to be safe we do 6
// 

@Injectable()
export class JobsService { 
  private agenda;
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public  pg: IDatabase<any>,
    private coingeckoNewTokenCheckJob: CoingeckoFirstCheckJob,
    private databaseService: DatabaseService,
    private coingeckoCurrentPricesJob: CoingeckoCurrentPricesJob
  ) {
    const connectionString = 'mongodb://127.0.0.1/agenda';
    this.agenda = new Agenda({
      db: {address: connectionString},
      processEvery: '30 seconds'
    });
     
    this.agenda
      .on('ready', async  () => {
        await this.agenda.start();
        await this.agenda.cancel({});
        console.log('Agenda started!');
        // check for new tokens on API
        this.agenda.define('CRAWL_COINGECKO_NEW_TOKENS', { lockLifetime: 10000 }, this.coingeckoNewTokenCheckJob.crawl_new_tokens.bind(this));
        this.agenda.every(NEW_TOKENS_SECONDS_INTERVAL+" seconds", 'CRAWL_COINGECKO_NEW_TOKENS', {});
        // get history for new tokens
        this.agenda.define('CRAWL_COINGECKO_NEW_TOKENS_HISTORY', { lockLifetime: 10000 }, this.coingeckoNewTokenCheckJob.crawl_new_tokens_history.bind(this));
        this.agenda.every(NEW_TOKENS_HISTORY_SECONDS_INTERVAL+" seconds", 'CRAWL_COINGECKO_NEW_TOKENS_HISTORY', {});
        // get current token prices
        this.agenda.define('CRAWL_COINGECKO_CURRENT_PRICE', { lockLifetime: 10000 }, this.coingeckoCurrentPricesJob.crawl.bind(this));
        this.agenda.every(CURRENT_PRICE_SECONDS_INTERVAL+" seconds", 'CRAWL_COINGECKO_CURRENT_PRICE', {});

      })
      .on('error', () => console.log('Agenda connection error!'));

    //this.agenda.start();
  }

}