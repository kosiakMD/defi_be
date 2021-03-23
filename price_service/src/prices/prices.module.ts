import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetPriceService } from '../services/asset_price.service';


import  AssetPrice  from '../models/asset_price.entity';
import  Asset  from '../models/asset.entity';

@Module({
	imports: [TypeOrmModule.forFeature([AssetPrice, Asset])],
	controllers: [PricesController],
	providers: [PricesService,AssetPriceService],
})
export class PricesModule {}
