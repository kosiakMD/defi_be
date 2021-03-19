import { ETH_ADDRESS, CURRENCY, PLATFORM } from '../utils/constants';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';
import { getCurrentCoinPrices, getCurrentEthPrice } from '../apis/coingecko.api';
import { isETH } from '../utils/common';
import { Injectable ,Inject} from '@nestjs/common';
import { DatabaseService } from '../services/database.service';

export type TokenPrices = { [key: string]: {value: number, db_id: any} };

@Injectable()
export class CoingeckoCurrentPricesJob {

  constructor(@Inject(
    NEST_PGPROMISE_CONNECTION) public  pg: IDatabase<any>,
    private databaseService: DatabaseService
  ) {
    console.log(databaseService)
  }

  public async crawl(job: any, done: any): Promise<void> {
  console.log("Started")
  console.log(this.databaseService)
    try{
      let current_platfrom_id = await this.databaseService.getCurrentPlatform();
      if(!current_platfrom_id)
        throw "No current platform in DB: "+PLATFORM;

      let current_currency_id = await this.databaseService.getCurrentCurrency();
      if(!current_currency_id)
        throw "No current currency in DB: "+CURRENCY;
      
      let db_assets =await this.databaseService.getTokensByPlatform(current_platfrom_id);
      
      if(db_assets.length){
        const db_token_addresses_chunks = createAddressChunks(db_assets);
        //NOTE: request str is too big, making chunks
        let results:any = {};
        for(let i=0 ; i<db_token_addresses_chunks.length; i++){
          let chunk_results = await getCurrentTokenPrices(db_token_addresses_chunks[i])
          results = Object.assign(results, chunk_results);
        }
       
        for(let i=0 ; i<db_assets.length; i++){
          if(results[db_assets[i]['address']]){
            results[db_assets[i]['address']]['db_id'] = db_assets[i]['id'];
          }
        }
        console.log("results ",results)
        await this.databaseService.addHourlyPricesToDb(results,current_currency_id);
      }
      
    }
    catch(e){
      console.log(e)
    }
    console.log("Add Current Prices Job done")
    done();
  }
}

const createAddressChunks = (addresses: any[]): string[][] =>{
    let  i,j,temparray,chunk = 100;
    let result=[]
    for (i=0,j=addresses.length; i<j; i+=chunk) {
        temparray = addresses.slice(i,i+chunk);
        const db_token_addresses = temparray.map((token) => token['address']);
        result.push(db_token_addresses);
    }
    return result;
  }

  const getEthPrice = async (): Promise<number> => {
      const { data } = await getCurrentEthPrice();
      return data[0].current_price;
    }

  const getCurrentTokenPrices =  async (tokens: string[]): Promise<TokenPrices> => {

    if (!tokens.length) {
      return {};
    }
    const response: TokenPrices = {};

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
