import { ETH_ADDRESS, CURRENCY, TEST_TOKENS, PLATFORM } from '../utils/constants';
import { Injectable ,Inject} from '@nestjs/common';
import { isETH, toTimestamp } from '../utils/common';
import rateLimit from 'axios-rate-limit';
import axios from 'axios';
const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });
export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';


export type CoingeckoTokenPrices = { [key: string]: {value: number, db_id: any} };
const tokens: string[] = TEST_TOKENS;

@Injectable()
export class BalancerFirstCheckJob {

  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION) public  pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api
  ) {}

  public async crawl_new_tokens(job: any, done: any): Promise<void> {
    
    try{
      let current_platfrom_id = await this.databaseService.getCurrentPlatform();
      if(!current_platfrom_id){
        throw "No current platform in DB: "+PLATFORM;
      }

      let current_currency_id = await this.databaseService.getCurrentCurrency();
      if(!current_currency_id){
        throw "No current currency in DB: "+CURRENCY;
      }
      
      console.log("request prepared")
      let tokenRequest = await this.theGraphService.getBalancerPoolsTokens();
      //console.log("tokens ",tokenRequest['data'][''])
      const tokens = tokenRequest['data']['data']['pools']

      let db_assets =await this.databaseService.getUniTokens();
      const db_token_addresses = db_assets.map((token) => token['address']);
      
      for(let i=0; i<tokens.length; i++ ){
        //console.log(i + " of "+tokens.length)
        
        let pool_tokens = tokens[i]['tokens'] 

        let lp_token_price = 0;
        console.log("checking token-pool  "+tokens[i]['id']+" with token length "+ pool_tokens.length);
        if(parseInt(tokens[i]['totalShares']) !== 0 ){
          let no_token_price = false,
          total_value_locked = 0,
          total_name = "",
          total_symbol = '';
          for(let z = 0; z<pool_tokens.length; z++){
            try{
            let token_price;
            console.log("pool_tokens[z] ",pool_tokens[z])
            total_name += (total_name.length ? '-' : '') + pool_tokens[z]['name'];
            total_symbol += (total_symbol.length ? '-' : '') + pool_tokens[z]['symbol'];

            let current_db_token = await this.databaseService.getTokenByAddress(pool_tokens[z]['id'].split('-')[1]);
            if(current_db_token.length){

              
              let current_db_token_price = await this.databaseService.getTokenPrice(current_db_token[0]['id']);
              if(current_db_token_price.length){
                console.log("price_found")
                token_price = current_db_token_price[0]['value'];
                console.log(current_db_token_price[0]['asset_id']+" --- ",token_price)
              }
              else{
                console.log('price_not_found')
              }
            } 
          
            if(!token_price){
                  console.log("no_token_price")
                  no_token_price = true;
                  break;
              }
                  
              total_value_locked += Number(pool_tokens[z]['balance']) * Number(token_price);
            
            }catch(e){
              console.log("Balancer token parse ERROR ",e)
            }
        }
        if(no_token_price){
          continue;
        }
      
          lp_token_price = total_value_locked / Number(tokens[i]['totalShares'])
          console.log('lp_token_price ----------------------------------------------------------------',lp_token_price);

          let db_pool = await this.databaseService.getTokenByAddress(tokens[i]['id']);
          console.log("db_pool ",db_pool)
          if(!db_pool.length){

            let new_entity = await this.databaseService.addNewSushiTokenToDb(
              tokens[i]['id'],
              total_name,
              total_symbol,
              PLATFORM,
              'BALANCER',
              current_platfrom_id);

              db_pool = await this.databaseService.getTokenByAddress(tokens[i]['id']);
          }

          await this.databaseService.addOnePrice(db_pool[0]['id'], toTimestamp(new Date()), lp_token_price, current_currency_id)
        
        }
        else {
          //console.log('totalShares is 0')
          continue;
        }
       
      }
      
    }
    catch(e){
      console.log(e)
    }
    done();
  }


  public crawl_new_tokens_history = async (job: any, done: any): Promise<void> => {
    let current_currency_id = await this.databaseService.getCurrentCurrency();
    if (!current_currency_id) {
        throw "No current currency in DB: " + CURRENCY;
    }
    
    let current_platfrom_id = await this.databaseService.getCurrentPlatform();
    if (!current_platfrom_id) {
        throw "No current platform in DB: " + PLATFORM;
    }
    
    let db_assets = await this.databaseService.getNewTokensByResource('BALANCER');
    console.log('starting uniswap history clawler')
    
    let first_tx_data = await this.theGraphService.getBalancerfirstTxTimestamp();
    const first_timestamp = parseInt(first_tx_data['data']['data']['transactions'][0]['timestamp']);
    console.log("first_tx_data ", first_tx_data['data']['data']['transactions'])
    
    const current_day_ts = Math.round(Date.now() / 1000);
    
    console.log(" current_day_ts ", current_day_ts)
    
    for (let i = 0; i < db_assets.length; i++) {
        let day_num = 0,
            check_day_ts = getNextDayStart(first_timestamp);
        console.log("check_day_ts ", check_day_ts)
        let prices_count = 0;
        do {
    
            let first_day_block_query = await this.theGraphService.getBalancerfirstBlockQuery(check_day_ts);
            const block_number = first_day_block_query['data']['data']['blocks'][0]['block'];
            console.log("block_number ", block_number)
    
            let daily_price_query = await this.theGraphService.getBalancerDailyBlockPricesQuery(parseInt(block_number), db_assets[i]['address']);
            console.log(daily_price_query['data']['data'])
            if (daily_price_query['data']['data']['pools'].length) {
                const {
                    totalShares,
                    tokens
                } = daily_price_query['data']['data']['pools'][0];
    
                let pool_tokens = tokens;
                let lp_token_price = 0;
    
                console.log("checking token-pool  " + db_assets[i]['address'] + " with token length " + pool_tokens.length);
                if (parseInt(totalShares) !== 0) {
    
                    let no_token_price = false,
                        total_value_locked = 0,
                        total_name = "",
                        total_symbol = '';
    
                    for (let z = 0; z < pool_tokens.length; z++) {
                        let token_price;
                        console.log("z ",z)
                        total_name += (total_name.length ? '-' : '') + pool_tokens[z]['name'];
                        total_symbol += (total_symbol.length ? '-' : '') + pool_tokens[z]['symbol'];
    
                        let current_db_token = await this.databaseService.getTokenByAddress(pool_tokens[z]['id'].split('-')[1]);
                        if (current_db_token.length) {
    
                            let current_db_token_price = await this.databaseService.getTokenPrice(current_db_token[0]['id']);
    
                            if (current_db_token_price.length) {
                                token_price = current_db_token_price[0]['value'];
                                console.log(current_db_token_price[0]['asset_id'] + " --- ", token_price)
                            } else {/*price not found */}
                        }
    
                        if (!token_price) {
                            no_token_price = true;
                            break;
                        }
    
                        total_value_locked += Number(pool_tokens[z]['balance']) * Number(token_price);
                        //console.log("total_value_locked ",total_value_locked)
    
                    }
                    if (no_token_price) {
                        console.log("no token price...NEXT")
                        continue;
                    }
    
                    lp_token_price = total_value_locked / Number(totalShares)
                    console.log('lp_token_price ----------------------------------------------------------------', lp_token_price);
    
    
                    await this.databaseService.addOnePrice(db_assets[i]['id'], check_day_ts, lp_token_price, current_currency_id)
                    prices_count++;
                } else {
                    //console.log('totalShares is 0')
                    day_num++;
                    continue;
                }
    
            }
    
            day_num++;
            console.log(check_day_ts)
            check_day_ts = getNextDayStart(first_timestamp, day_num);
        } while (check_day_ts < current_day_ts);
       
        if(prices_count){
          await this.databaseService.setAssetAsNotNew(db_assets[i]['id'])
          console.log("Updated pool to OLD from NEW")
        }
         
        
    }
    
    done();
  }

}


const getNextDayStart = (ts: number, day = 0) => {
	const secondsInDay = 86400;
	const dayId = Math.round(ts / secondsInDay);
	return (dayId + day) * secondsInDay;
};
