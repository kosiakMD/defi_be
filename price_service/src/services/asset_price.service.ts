import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';

import Asset from '../models/asset.entity';
import AssetPrice from '../models/asset_price.entity';
import { CurrentPrice, HistoricalPrice } from '../prices/interfaces/prices.interface';
import { getNextDayOfDate, timestampNow, timestampOfDate } from '../utils/time';

enum PricesInterval {
	Daily,
	Hourly,
}

const SECONDS_IN_DAY = 60 * 24 * 60;
@Injectable()
export class AssetPriceService {
	constructor(
		@InjectRepository(AssetPrice) private readonly repo: Repository<AssetPrice>,
		@InjectRepository(Asset) private readonly asset_repo: Repository<Asset>,
	) {}

	public async getAll() {
		return await this.repo.find();
	}

	public async getCurrent(address_array, currency_id = 1, platform_id = 1): Promise<CurrentPrice[]> {
		const entityManager = getManager();
		address_array = "('" + address_array.join("','") + "')";

		const querystr =
			`SELECT a.*, ap.*
    FROM prices.asset a
    JOIN prices.asset_price ap ON (a.id = ap.asset_id)
    LEFT OUTER JOIN prices.asset_price  ap2 ON (a.id = ap2.asset_id AND 
        (ap.timestamp < ap2.timestamp ))
    WHERE ap2.timestamp IS NULL AND a.address IN ` +
			address_array +
			` AND a.platform_id = ` +
			platform_id +
			`AND ap.currency_id = ` +
			currency_id +
			`;`;

		const db_entities = await entityManager.query(querystr),
			response = {};

		db_entities.map(function (item) {
			response[item.address] = item.value;
			return;
		});

		return response as CurrentPrice[];
	}

    public async getHistorical(address_array, timestamps: number[], currency_id =1, platform_id=1):Promise<HistoricalPrice[]> {
      const entityManager = getManager();
      //address_array = "('"+address_array.join("','")+"')";
      //let {from,to}=this.getRangePrices(timestamps);
      let response = {};
      address_array.map(function(item) {
            response[item] = {};
      });

      for(let i=0 ; i<timestamps.length; i++){
        for(let address_i = 0; address_i < address_array.length; address_i ++  ){
          let querystr = getNearestTimeString(address_array[address_i],platform_id, currency_id, timestamps[i] );
          console.log(querystr)
          let db_entities = await entityManager.query(querystr);
          if(db_entities.length){
            response[address_array[address_i]][timestamps[i]+''] = db_entities[0].value;
          }
          else{
            response[address_array[address_i]][timestamps[i]+''] = 0 ;
          }
        }

      }
    
      return response as HistoricalPrice[];
  
      }

    public async getHistoricalOld(address_array, timestamps: number[], currency_id =1, platform_id=1):Promise<HistoricalPrice[]> {
        const entityManager = getManager();
        address_array = "('"+address_array.join("','")+"')";
        let {from,to}=this.getRangePrices(timestamps);
        let querystr = `SELECT a.*, ap.*
        FROM prices.asset a JOIN prices.asset_price ap ON (a.id = ap.asset_id)
        WHERE a.address IN `+address_array+` AND a.platform_id = `+
        platform_id+`AND ap.currency_id = `+currency_id+` AND ap.timestamp >=`+from+` AND ap.timestamp <=`+to+`ORDER BY ap.timestamp ASC;`
            console.log(querystr)
        
        
        let db_entities = await entityManager.query(querystr);
        //return db_entities;
        let response = {};
        
        db_entities.map(function(item) {
            if(!response[item.address]){
                response[item.address] = {};
            }
            response[item.address][item.timestamp+''] = item.value;
            return;
          });
    
        return response as HistoricalPrice[];
    
        }

        private getRangePrices(timestamps: number[]): { from: number, to: number, interval: PricesInterval } {
            const maxHourlyPricesPeriodInDays = 10;
            const min = Math.min(...timestamps);
            const now = timestampNow();
        
            // NOTE: We load daily prices for dates over 10 days and hourly in case of shorter terms
            if (now - min > maxHourlyPricesPeriodInDays * SECONDS_IN_DAY) {
              return {
                from: timestampOfDate(new Date(2013, 0, 1)),
                to: now,
                interval: PricesInterval.Daily,
              };
            } else {
              const from = new Date();
              from.setDate(from.getDate() - maxHourlyPricesPeriodInDays);
              return {
                from: timestampOfDate(getNextDayOfDate(from)),
                to: now,
                interval: PricesInterval.Hourly,
              };
            }
          }
}

let getNearestTimeString = (address, platform_id, currency_id, timestamp) => `SELECT a.*, ap.*
      FROM prices.asset a
      JOIN prices.asset_price ap ON (a.id = ap.asset_id)
      WHERE a.address = '`+address+`' AND a.platform_id = `+
      platform_id+`AND ap.currency_id = `+currency_id+`  ORDER BY ABS(`+timestamp+` - ap.timestamp) ASC LIMIT 1`;
