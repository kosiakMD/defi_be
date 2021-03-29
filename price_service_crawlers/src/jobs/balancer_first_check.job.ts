import { ETH_ADDRESS, CURRENCY, TEST_TOKENS, PLATFORM } from '../utils/constants';
import { Injectable ,Inject} from '@nestjs/common';
import { isETH, toTimestamp } from '../utils/common';
import rateLimit from 'axios-rate-limit';
import axios from 'axios';
import { getCurrentCoinPrices, getCurrentEthPrice } from '../apis/coingecko.api';
const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });
import { IDatabase } from 'pg-promise';
export type TokenPrices = { [key: string]: number };
export type TokenAddreses = { [key: string]: number };
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { getCoin, getCoinRangePrices, getCoins } from '../apis/coingecko.api';
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
        
        let pool_tokens = tokens[i]['tokens'] 

        let lp_token_price = 0;
       console.log("checking token-pool  "+tokens[i]['id']+" with token length "+ pool_tokens.length);
        if(parseInt(tokens[i]['totalShares']) !== 0 ){
          let no_token_price = false,
          total_value_locked = 0,
          total_name = "",
          total_symbol = '';
          for(let z = 0; z<pool_tokens.length; z++){
            let token_price;

            total_name += (total_name.length ? '-' : '') + pool_tokens[z]['name'];
            total_symbol += (total_symbol.length ? '-' : '') + pool_tokens[z]['symbol'];

            let current_db_token = await this.databaseService.getTokenByAddress(pool_tokens[z]['id'].split('-')[1]);
            if(current_db_token.length){

              //console.log(pool_tokens[z]['id'].split('-')[1] + " found in DB")
              let current_db_token_price = await this.databaseService.getTokenPrice(current_db_token[0]['id']);
              if(current_db_token_price.length){
                token_price = current_db_token_price[0]['value'];
                console.log(current_db_token_price[0]['asset_id']+" --- ",token_price)
              }
              else{
                //console.log('price_not_found')
              }
            } 
            
            if(!token_price){
              //console.log(pool_tokens[z]['id'].split('-')[1] + " NOT found in DB")

              let coingecko_prices = await getCurrentTokenPrices([pool_tokens[z]['id'].split('-')[1]]);
              if(coingecko_prices[pool_tokens[z]['id'].split('-')[1]] && coingecko_prices[pool_tokens[z]['id'].split('-')[1]].value !== undefined)
                token_price = coingecko_prices[pool_tokens[z]['id'].split('-')[1]].value;

              console.log("coingecko_prices for "+pool_tokens[z]['id'].split('-')[1]+" ",coingecko_prices)
            }

            if(!token_price){
              no_token_price = true;
              break;
            }

            //console.log("pool_tokens[z]['balance'] ",pool_tokens[z]['balance'])
            total_value_locked += Number(pool_tokens[z]['balance']) * Number(token_price);
              //console.log("total_value_locked ",total_value_locked)

            


          }

          if(no_token_price){
            //console.log('no price of one of subtokens')
            continue;
          }

          //console.log('total_value_locked ',total_value_locked)
          //console.log("tokens[i]['totalShares']) ",tokens[i]['totalShares'])
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
      if(!current_currency_id){
        throw "No current currency in DB: "+CURRENCY;
      }
        
      let db_assets = await this.databaseService.getNewTokensByResource('UNISWAP');
      console.log('starting uniswap history clawler')

      let first_tx_data= await this.theGraphService.getBalancerfirstTxTimestamp();
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
            
            let first_day_block_query  =  await this.theGraphService.getBalancerfirstBlockQuery(check_day_ts);
            const block_number = first_day_block_query['data']['data']['blocks'][0]['block'];
            console.log("block_number ",block_number)

            let daily_price_query = await this.theGraphService.getBalancerDailyBlockPricesQuery(parseInt(block_number), db_assets[i]['address']);
            console.log(daily_price_query['data']['data'])
            if(daily_price_query['data']['data']['pairs'].length){
              const {totalShares, tokens} = daily_price_query['data']['data']['pairs'][0];
            
              if(Number(totalShares)){
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

const getCurrentTokenPrices =  async (tokens: string[]): Promise<CoingeckoTokenPrices> => {

  if (!tokens.length) {
    return {};
  }
  const response: CoingeckoTokenPrices = {};

  // NOTE: Special handling of ETH
  if (tokens.includes(ETH_ADDRESS)) {
    response[ETH_ADDRESS] = {value: await getEthPrice(), db_id: null};
  }

  const addresses = tokens.filter(token => !isETH(token)).join(',');
  const { data } = await getCurrentCoinPrices(addresses);

  return Object.keys(data).reduce((response, key) => ({
    ...response,
    [key]: {value: data[key].usd, db_id: null}
  }), response);
}

const getEthPrice = async (): Promise<number> => {
  const { data } = await getCurrentEthPrice();
  return data[0].current_price;
}
