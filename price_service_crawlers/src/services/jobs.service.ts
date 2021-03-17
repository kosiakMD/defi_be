import { Injectable } from '@nestjs/common';
import { AgendaService } from 'nestjs-agenda';
import { crawlCoingeckoJob } from '../jobs/coingecko.job'
import { SECONDS_INTERVAL } from '../utils/constants';

 
// NOTE: We are limited to 10 bu to be safe we do 6
//const http = rateLimit(axios.create(), { maxRPS: 6, perMilliseconds: 1000 });

@Injectable()
export class JobsService { 
  constructor(private readonly agenda: AgendaService) {
    this.agenda.define('CRAWL_COINGECKO', { lockLifetime: 10000 }, crawlCoingeckoJob.bind(this));
    this.agenda.every(SECONDS_INTERVAL+" seconds", 'CRAWL_COINGECKO', {});
  }
 

}