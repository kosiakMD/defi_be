import Agenda from 'agenda';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../Logger/Logger.service';
import { CoingeckoJob } from '../jobs/coingecko.job';
import { CommonJob } from '../jobs/common.job';
import { PancakeJob } from '../jobs/pancake.job';
import { SushiswapJob } from '../jobs/sushiswap.job';
import { UniswapJob } from '../jobs/uniswap.job';
import { Api } from '../thegraph/api';
import '../utils/constants';
import { DatabaseService } from './database.service';

// NOTE: We are limited to 10 bu to be safe we do 6

@Injectable()
export class JobsService {
  private agenda;
  private CURRENT_PRICE_SECONDS_INTERVAL;
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api,
    private coingeckoJob: CoingeckoJob,
    private sushiSwapJob: SushiswapJob,
    private uniSwapJob: UniswapJob,
    private pancakeJob: PancakeJob,
    private commonJob: CommonJob,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL
      ? parseInt(process.env.CURRENT_PRICE_SECONDS_INTERVAL)
      : 300;
    const connectionString =
      'mongodb://' +
      process.env.MONGO_USER +
      ':' +
      process.env.MONGO_PASS +
      '@' +
      process.env.MONGO_HOST +
      ':' +
      process.env.MONGO_PORT +
      '/agenda?authMechanism=DEFAULT&authSource=admin'; //'mongodb://127.0.0.1/agenda';
    this.agenda = new Agenda({
      defaultLockLifetime: 10000,
      db: { address: connectionString },
      processEvery: '30 seconds',
    });

    const NEW_TOKENS_HISTORY_SECONDS_INTERVAL =
      process.env.HISTORY_PRICE_SECONDS_INTERVAL || 60 * 60;
    const CURRENT_PRICE_SECONDS_INTERVAL = process.env.CURRENT_PRICE_SECONDS_INTERVAL || 5 * 60;
    const LOCK_LIFE_TIME = 10000;

    this.agenda
      .on('ready', async () => {
        await this.agenda.start();
        // await this.agenda.cancel({});

        const cancel = async (jobName: string) => {
          if (!jobName) {
            return null;
          }

          const cancelResult = await this.agenda.cancel({ name: jobName });
          this.logger.log(
            `agenda.cancel: [${jobName}], result: [${
              cancelResult === 1 ? 'cancelled' : 'not cancelled'
            }]`,
            'Agenda',
          );
          return cancelResult;
        };

        const setAgendaTask = async (
          taskName: string,
          method: string,
          job: CoingeckoJob | SushiswapJob | UniswapJob | PancakeJob | CommonJob,
          interval: string | number = CURRENT_PRICE_SECONDS_INTERVAL,
        ): Promise<void> => {
          await cancel(taskName);
          this.agenda.define(
            taskName,
            {
              lockLifetime: LOCK_LIFE_TIME,
            },
            job[method].bind(this),
          );
          this.agenda.every(interval + ' seconds', taskName, {});
        };

        this.logger.log('Agenda started');

        // COINGECKO
        setAgendaTask(
          'CRAWL_COINGECKO_CURRENT_PRICE1',
          'getCurrentPrices',
          this.coingeckoJob,
          CURRENT_PRICE_SECONDS_INTERVAL,
        );

        setAgendaTask(
          'CRAWL_COINGECKO_NEW_TOKENS_HISTORY',
          'crawlNewTokensHistory',
          this.coingeckoJob,
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
        );

        //PANCAKE
        setAgendaTask(
          'CRAWL_PANCAKE_CURRENT_PRICE',
          'getCurrentPrices',
          this.pancakeJob,
          CURRENT_PRICE_SECONDS_INTERVAL,
        );

        //SUSHI
        setAgendaTask(
          'CRAWL_SUSHI_CURRENT_PRICE',
          'getCurrentPrices',
          this.sushiSwapJob,
          CURRENT_PRICE_SECONDS_INTERVAL,
        );

        setAgendaTask(
          'CRAWL_SUSHI_NEW_TOKENS_HISTORY',
          'crawlNewTokensHistory',
          this.sushiSwapJob,
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
        );

        // UNI
        setAgendaTask(
          'CRAWL_UNISWAP_CURRENT_PRICE',
          'getCurrentPrices',
          this.uniSwapJob,
          CURRENT_PRICE_SECONDS_INTERVAL,
        );

        setAgendaTask(
          'CRAWL_UNISWAP_NEW_TOKENS_HISTORY',
          'crawlNewTokensHistory',
          this.uniSwapJob,
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
        );

        // clean prices to reduce database size
        setAgendaTask(
          'CRAWL_DELETE_EXTRA_PRICES',
          'removeExtraPrices',
          this.commonJob,
          NEW_TOKENS_HISTORY_SECONDS_INTERVAL,
        );
      })
      .on('error', (e) => this.logger.error('Agenda connection error!', e));

    //this.agenda.start();
  }
}
