import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import Asset from '../models/asset.entity';
import AssetPrice from '../models/asset_price.entity';
import { AssetPriceService } from '../services/asset_price.service';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

@Module({
	imports: [TypeOrmModule.forFeature([AssetPrice, Asset])],
	controllers: [PricesController],
	providers: [PricesService, AssetPriceService],
})
export class PricesModule {}
