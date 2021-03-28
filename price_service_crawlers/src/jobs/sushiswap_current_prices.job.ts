import { ETH_ADDRESS, CURRENCY, PLATFORM } from '../utils/constants';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';
import { getCurrentCoinPrices, getCurrentEthPrice } from '../apis/coingecko.api';
import { isETH } from '../utils/common';
import { Injectable ,Inject} from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';


export type TokenPrices = { [key: string]: {value: number, db_id: any} };

@Injectable()
export class SushiswapCurrentPricesJob {

  constructor(@Inject(
    NEST_PGPROMISE_CONNECTION) public  pg: IDatabase<any>,
    private databaseService: DatabaseService,
    private theGraphService: Api
  ) {
  
  }

  public async crawl(job: any, done: any): Promise<void> {
    console.log("Current SUSHI Prices Job Sarted")
    try{
      let current_platfrom_id = await this.databaseService.getCurrentPlatform();
      if(!current_platfrom_id)
        throw "No current platform in DB: "+PLATFORM;

      let current_currency_id = await this.databaseService.getCurrentCurrency();
      if(!current_currency_id)
        throw "No current currency in DB: "+CURRENCY;
      
      let db_assets = await this.databaseService.getSushiTokens();
      
      if (db_assets.length) {
        let results:any = {};

        for(let i = 0 ; i < db_assets.length; i++){
              console.log(db_assets[i]['address'])
          let one_results =  await this.theGraphService.getCurrentSushiTokenPrices(db_assets[i]['address'])
         
          if(one_results['data']['data']['dataPairs'].length){
            const {reserveUSD, totalSupply} = one_results['data']['data']['dataPairs'][0];
            
            //console.log("reserveUSD "+reserveUSD+" totalSupply "+totalSupply+" res ",(Number(reserveUSD) / Number(totalSupply)))
            results[db_assets[i]['address']] = {
              db_id: db_assets[i]['id'],
              value: (Number(reserveUSD) ===0 ||  Number(totalSupply)===0) ? 0 : (Number(reserveUSD) / Number(totalSupply))
            }
            
          }
        }
       
        await this.databaseService.addHourlyPricesToDb(results,current_currency_id);
      }
      
    }
    catch(e){
      console.log(e)
    }
    console.log("Add Current SUSHI Prices Job done")
    done();
  }
}

  const getEthPrice = async (): Promise<number> => {
      const { data } = await getCurrentEthPrice();
      return data[0].current_price;
    }

