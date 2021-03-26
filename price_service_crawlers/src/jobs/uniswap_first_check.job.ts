import { ETH_ADDRESS, CURRENCY, TEST_TOKENS, PLATFORM } from '../utils/constants';
import { Injectable ,Inject} from '@nestjs/common';
import { isETH, toTimestamp } from '../utils/common';
import rateLimit from 'axios-rate-limit';
import axios from 'axios';
const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });
import { IDatabase } from 'pg-promise';
export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { getCoin, getCoinRangePrices, getCoins } from '../apis/coingecko.api';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';

const tokens: string[] = TEST_TOKENS;

@Injectable()
export class UniSwapFirstCheckJob {

  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public  pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api
  ) {
    
  }

  public async crawl_new_tokens(job: any, done: any): Promise<void> {
    
    try{
      let current_platfrom_id = await this.databaseService.getCurrentPlatform();
      if(!current_platfrom_id){
        throw "No current platform in DB: "+PLATFORM;
      }
      console.log("request prepared")
      let tokenRequest = await this.theGraphService.getUniswapPoolsTokens();
      console.log("tokens ",tokenRequest)
      console.log("tokens ",tokenRequest['data']['data']['dataPairs'])
      const tokens = tokenRequest['data']['data']['dataPairs']

      let db_assets =await this.databaseService.getUniTokens();
      const db_token_addresses = db_assets.map((token) => token['address']);
      

      for(let i=0; i<tokens.length; i++ ){
        console.log(tokens[i]['id'])
        if(db_token_addresses.indexOf(tokens[i]['id'])===-1)
          await this.databaseService.addNewSushiTokenToDb(
            tokens[i]['id'],
            tokens[i]['token0']['name']+'-'+tokens[i]['token1']['name'],
            tokens[i]['token0']['symbol']+'-'+tokens[i]['token1']['symbol'],
            PLATFORM,
            'UNISWAP',
            current_platfrom_id);
      }
      
    }
    catch(e){
      console.log(e)
    }
    done();
  }


  public crawl_new_tokens_history = async (job: any, done: any): Promise<void> => {

      let current_currency_id = await this.databaseService.getCurrentCurrency();
      if(!current_currency_id){
        throw "No current currency in DB: "+CURRENCY;
      }
        
      let db_assets =await this.databaseService.getNewTokensByResource('UNISWAP');
      console.log('starting uniswap history clawler')

      let first_tx_data= await this.theGraphService.getUniwapfirstTxTimestamp();
      const first_timestamp = parseInt(first_tx_data['data']['data']['transactions'][0]['timestamp']);
      console.log("first_tx_data ",first_tx_data['data']['data']['transactions'])

      const current_day_ts = Math.round(Date.now() / 1000);
     
      console.log(" current_day_ts ",current_day_ts)
    
      for(let i =0 ; i< db_assets.length; i++){
        let day_num = 0,
        check_day_ts = getNextDayStart(first_timestamp);
        console.log("check_day_ts ",check_day_ts)
        let prices = [];
          do {
            
            let first_day_block_query  =  await this.theGraphService.getUniswapfirstBlockQuery(check_day_ts);
            const block_number = first_day_block_query['data']['data']['blocks'][0]['blockNumber'];
            console.log("block_number ",block_number)

            let daily_price_query = await this.theGraphService.getUniswapDailyBlockPricesQuery(parseInt(block_number), db_assets[i]['address']);
            console.log(daily_price_query['data']['data'])
            if(daily_price_query['data']['data']['pairs'].length){
              const {reserveUSD, totalSupply} = daily_price_query['data']['data']['pairs'][0];
            
              if(reserveUSD && totalSupply){
                prices.push([check_day_ts, (Number(reserveUSD) ===0 ||  Number(totalSupply)===0) ? 0 : (Number(reserveUSD) / Number(totalSupply))])
              }
            }
            
            day_num ++;
            console.log(check_day_ts)
            check_day_ts =  getNextDayStart(first_timestamp, day_num);
          } while (check_day_ts < current_day_ts);
      console.log('prices ',prices)
      await crawlCoin(db_assets[i].id, db_assets[i], prices, current_currency_id, this.databaseService);
    }
  
    done();
  }

}

async function crawlCoin(coin_id, coin, prices, currency_id, db) {
 
  if (!coin.address) {
    console.log(`Coin ${coin.id} ${coin.symbol} address not found, skipping`);
    return;
  }

  console.log(`uniswap ${prices.length} prices found`);
  if(prices.length){
    const tokenPrices = prices.map(([timestamp, price]) => ({
      id: coin.id,
      address: coin.address,
      timestamp: Math.round(timestamp / 1000),
      price: price,
      currency_id
    }));

    return await db.saveTokenPrices(coin_id, tokenPrices);
  }
 return true;
}

const getNextDayStart = (ts: number, day=0)=>{
  const secondsInDay = 86400;
  const dayId = Math.round(ts / secondsInDay);
  return  (dayId+day) * secondsInDay;
}
